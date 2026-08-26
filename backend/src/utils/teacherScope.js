import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
import EssayQuestion from "../models/EssayQuestion.js";
import User from "../models/User.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueObjectIds(ids = []) {
  const seen = new Set();
  const result = [];

  for (const id of ids) {
    if (!id) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }

  return result;
}

/**
 * Keep original class ids and also include any duplicate rows that share
 * the same className + academicYear (common after repeated seeding).
 */
async function expandClassIdsWithNameYearTwins(classDocs = []) {
  const originalIds = uniqueObjectIds(classDocs.map((item) => item._id));
  if (!originalIds.length) return [];

  const queries = classDocs
    .filter((item) => item?.className)
    .map((item) => {
      const query = {
        className: {
          $regex: `^${escapeRegex(String(item.className).trim())}$`,
          $options: "i",
        },
      };

      if (item.academicYear) {
        query.academicYear = String(item.academicYear);
      }

      return query;
    });

  if (!queries.length) return originalIds;

  const twins = await Class.find({ $or: queries }).select("_id");
  return uniqueObjectIds([...originalIds, ...twins.map((item) => item._id)]);
}

/**
 * Resolve a class id to itself plus duplicate Class rows that represent the
 * same teaching group. Marks/attendance seeding often creates twins that share
 * className (+ grade) but differ on academicYear string — include those too.
 */
export async function resolveClassTwinIds(
  classId,
  { ignoreYear = true } = {}
) {
  if (!classId) return [];

  const classDoc = await Class.findById(classId).select(
    "className academicYear gradeLevel"
  );
  if (!classDoc) return [classId];

  const query = {
    className: {
      $regex: `^${escapeRegex(String(classDoc.className || "").trim())}$`,
      $options: "i",
    },
  };

  if (!ignoreYear && classDoc.academicYear) {
    query.academicYear = String(classDoc.academicYear);
  }

  if (classDoc.gradeLevel) {
    query.gradeLevel = classDoc.gradeLevel;
  }

  const twins = await Class.find(query).select("_id");
  return uniqueObjectIds([classDoc._id, ...twins.map((item) => item._id)]);
}

/**
 * Resolve subject ids to themselves plus duplicate Subject rows that share
 * the same subjectName / subjectCode (common after reseeding catalogs).
 */
export async function resolveSubjectTwinIds(subjectIds = []) {
  const originalIds = uniqueObjectIds(subjectIds);
  if (!originalIds.length) return [];

  const originals = await Subject.find({ _id: { $in: originalIds } }).select(
    "subjectName subjectCode"
  );

  const queries = [];
  for (const subject of originals) {
    if (subject.subjectName) {
      queries.push({
        subjectName: {
          $regex: `^${escapeRegex(String(subject.subjectName).trim())}$`,
          $options: "i",
        },
      });
    }
    if (subject.subjectCode) {
      queries.push({
        subjectCode: {
          $regex: `^${escapeRegex(String(subject.subjectCode).trim())}$`,
          $options: "i",
        },
      });
    }
  }

  if (!queries.length) return originalIds;

  const twins = await Subject.find({ $or: queries }).select("_id");
  return uniqueObjectIds([...originalIds, ...twins.map((item) => item._id)]);
}

/** Unique display labels like "12 Commerce A (2026)". */
export function formatClassScopeLabel(classItem) {
  const name = classItem?.className || "Class";
  const year = classItem?.academicYear ? ` (${classItem.academicYear})` : "";
  return `${name}${year}`;
}

export function uniqueClassLabels(classes = []) {
  const seen = new Set();
  const labels = [];

  for (const item of classes) {
    const label = formatClassScopeLabel(item);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}

/**
 * Resolve the classes, subjects, and students belonging to one teacher
 * based on admin assignments:
 * - subjects where assignedTeacher = this teacher
 * - classes where assignedTeacher = this teacher
 * - classes linked on those assigned subjects
 *
 * Subjects returned are ONLY admin-assigned subjects (not every subject
 * taken by students in those classes).
 */
export async function getTeacherScope(teacherId) {
  let teacher = await User.findById(teacherId).select(
    "fullName email assignedSubject assignedClass"
  );

  // Repair older teacher accounts that still own legacy singular pointers
  // but never received User.assignedSubject / User.assignedClass.
  if (teacher) {
    const repair = {};

    if (!teacher.assignedSubject) {
      const legacySubject = await Subject.findOne({
        $or: [
          { assignedTeacher: teacherId },
          { assignedTeachers: teacherId },
        ],
      })
        .select("_id")
        .sort({ subjectName: 1 });
      if (legacySubject) {
        repair.assignedSubject = legacySubject._id;
        teacher.assignedSubject = legacySubject._id;
      }
    }

    // Papers this teacher created still prove their teaching subject.
    if (!teacher.assignedSubject) {
      const paperSubjectId = await EssayQuestion.findOne({
        createdBy: teacherId,
        subject: { $ne: null },
      })
        .sort({ createdAt: -1 })
        .select("subject");
      if (paperSubjectId?.subject) {
        repair.assignedSubject = paperSubjectId.subject;
        teacher.assignedSubject = paperSubjectId.subject;
      }
    }

    if (!teacher.assignedClass) {
      const legacyClass = await Class.findOne({ assignedTeacher: teacherId })
        .select("_id")
        .sort({ gradeLevel: 1, className: 1 });
      if (legacyClass) {
        repair.assignedClass = legacyClass._id;
        teacher.assignedClass = legacyClass._id;
      }
    }

    if (Object.keys(repair).length > 0) {
      await User.updateOne({ _id: teacherId }, { $set: repair });
    }
  }

  // 1) Admin-assigned subjects: lead pointer, co-teacher list, User link,
  //    and subject twins so catalog reseeds do not blank the dashboard.
  const subjectsFromPointer = await Subject.find({
    $or: [
      { assignedTeacher: teacherId },
      { assignedTeachers: teacherId },
    ],
  })
    .select("subjectName subjectCode classes assignedTeacher assignedTeachers")
    .sort({ subjectName: 1 });

  let subjectsFromUser = [];
  if (teacher?.assignedSubject) {
    const twinSubjectIds = await resolveSubjectTwinIds([
      teacher.assignedSubject,
    ]);
    subjectsFromUser = await Subject.find({
      _id: { $in: twinSubjectIds },
    }).select("subjectName subjectCode classes assignedTeacher assignedTeachers");
  }

  // Keep co-teacher membership durable even for older rows that only had
  // the singular assignedTeacher field populated.
  const membershipIds = uniqueObjectIds([
    ...subjectsFromPointer.map((item) => item._id),
    ...subjectsFromUser.map((item) => item._id),
  ]);
  if (membershipIds.length > 0) {
    await Subject.updateMany(
      { _id: { $in: membershipIds } },
      { $addToSet: { assignedTeachers: teacherId } }
    );
  }

  const subjectById = new Map();
  [...subjectsFromPointer, ...subjectsFromUser].forEach((subject) => {
    subjectById.set(String(subject._id), subject);
  });
  const subjects = [...subjectById.values()].sort((a, b) =>
    String(a.subjectName || "").localeCompare(String(b.subjectName || ""))
  );

  const taughtSubjectIds = subjects.map((subject) => subject._id);

  const subjectLinkedClassIds = uniqueObjectIds(
    subjects.flatMap((subject) => subject.classes || [])
  );

  // If User still has no class but their subject links classes, persist the
  // first linked class so My Classes / dashboard cards stay stable.
  if (teacher && !teacher.assignedClass && subjectLinkedClassIds.length > 0) {
    const linkedClass = await Class.findById(subjectLinkedClassIds[0]).select(
      "_id"
    );
    if (linkedClass) {
      teacher.assignedClass = linkedClass._id;
      await User.updateOne(
        { _id: teacherId },
        { $set: { assignedClass: linkedClass._id } }
      );
    }
  }

  // Classes where enrolled students take this teacher's subjects
  // (covers subjects that were never linked to Class.classes[]).
  let studentSubjectClassIds = [];
  if (taughtSubjectIds.length > 0) {
    studentSubjectClassIds = await StudentProfile.distinct("class", {
      subjects: { $in: taughtSubjectIds },
      class: { $ne: null },
    });
  }

  // 2) Admin-assigned classes + classes linked from assigned subjects
  //    + classes of students taking those subjects + User.assignedClass.
  const seedQuery = {
    $or: [{ assignedTeacher: teacherId }],
  };

  const linkedClassIds = uniqueObjectIds([
    ...subjectLinkedClassIds,
    ...studentSubjectClassIds,
    ...(teacher?.assignedClass ? [teacher.assignedClass] : []),
  ]);

  if (linkedClassIds.length > 0) {
    seedQuery.$or.push({ _id: { $in: linkedClassIds } });
  }

  const seedClasses = await Class.find(seedQuery).select(
    "className academicYear gradeLevel"
  );

  const expandedClassIds = await expandClassIdsWithNameYearTwins(seedClasses);

  const classes =
    expandedClassIds.length > 0
      ? await Class.find({ _id: { $in: expandedClassIds } })
          .select("className academicYear gradeLevel")
          .sort({ gradeLevel: 1, className: 1, academicYear: 1 })
      : [];

  const classIds = classes.map((item) => item._id);

  // 3) Students in assigned classes, or students taking assigned subjects,
  //    or students who already have attendance in those classes.
  const studentQuery = { $or: [] };
  if (classIds.length > 0) {
    studentQuery.$or.push({ class: { $in: classIds } });
  }
  if (taughtSubjectIds.length > 0) {
    studentQuery.$or.push({ subjects: { $in: taughtSubjectIds } });
  }
  if (classIds.length > 0) {
    try {
      const attendanceStudentIds = await Attendance.distinct("student", {
        class: { $in: classIds },
      });
      if (attendanceStudentIds.length > 0) {
        studentQuery.$or.push({ _id: { $in: attendanceStudentIds } });
      }
    } catch (attendanceScopeError) {
      // Attendance lookup must never blank the whole teacher scope.
      console.warn(
        "getTeacherScope attendance lookup failed:",
        attendanceScopeError.message
      );
    }
  }

  const students =
    studentQuery.$or.length > 0
      ? await StudentProfile.find(studentQuery).select(
          "_id studentId riskStatus attendancePercentage class subjects parent"
        )
      : [];

  const subjectIds = taughtSubjectIds;
  const studentIds = students.map((student) => student._id);

  // Display-only admin assignment (Add Teacher / Subjects). Prefer User
  // fields, then legacy pointers, then subject-linked class names (no year
  // twin spam on the dashboard cards).
  let adminAssignedClasses = [];
  if (teacher?.assignedClass) {
    const assignedClassDoc = await Class.findById(teacher.assignedClass).select(
      "className academicYear gradeLevel"
    );
    if (assignedClassDoc) adminAssignedClasses = [assignedClassDoc];
  }

  if (adminAssignedClasses.length === 0) {
    adminAssignedClasses = await Class.find({ assignedTeacher: teacherId })
      .select("className academicYear gradeLevel")
      .sort({ gradeLevel: 1, className: 1, academicYear: 1 });
  }

  if (adminAssignedClasses.length === 0 && subjectLinkedClassIds.length > 0) {
    const linkedClasses = await Class.find({
      _id: { $in: subjectLinkedClassIds },
    })
      .select("className academicYear gradeLevel")
      .sort({ gradeLevel: 1, className: 1, academicYear: 1 });

    const seenNames = new Set();
    adminAssignedClasses = linkedClasses.filter((item) => {
      const key = String(item.className || "")
        .trim()
        .toLowerCase();
      if (!key || seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
  }

  let adminAssignedSubjects = subjects;
  if (teacher?.assignedSubject) {
    const assignedSubjectDoc = await Subject.findById(
      teacher.assignedSubject
    ).select("subjectName subjectCode");
    if (assignedSubjectDoc) adminAssignedSubjects = [assignedSubjectDoc];
  }

  return {
    teacher,
    classes,
    subjects,
    classIds,
    classIdStrings: classIds.map((id) => id.toString()),
    classLabels: uniqueClassLabels(classes),
    adminAssignedClasses,
    adminAssignedClassIds: adminAssignedClasses.map((item) => item._id),
    adminAssignedClassIdStrings: adminAssignedClasses.map((item) =>
      String(item._id)
    ),
    adminAssignedClassLabels: uniqueClassLabels(adminAssignedClasses),
    subjectIds,
    subjectIdStrings: subjectIds.map((id) => id.toString()),
    subjectLabels: subjects.map((item) => item.subjectName).filter(Boolean),
    adminAssignedSubjectLabels: adminAssignedSubjects
      .map((item) => item.subjectName || item.subjectCode)
      .filter(Boolean),
    students,
    studentIds,
    studentIdStrings: studentIds.map((id) => id.toString()),
  };
}

export async function assertTeacherOwnsClass(teacherId, classId) {
  if (!classId) return false;

  const scope = await getTeacherScope(teacherId);
  return scope.classIdStrings.includes(String(classId));
}

export async function assertTeacherOwnsSubject(teacherId, subjectId) {
  if (!subjectId) return false;

  const subject = await Subject.findById(subjectId).select("assignedTeacher");
  if (subject && String(subject.assignedTeacher || "") === String(teacherId)) {
    return true;
  }

  const teacher = await User.findById(teacherId).select("assignedSubject");
  return (
    teacher?.assignedSubject &&
    String(teacher.assignedSubject) === String(subjectId)
  );
}
