import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
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
  const teacher = await User.findById(teacherId).select("fullName email");

  // 1) Admin-assigned subjects only.
  const subjects = await Subject.find({ assignedTeacher: teacherId })
    .select("subjectName subjectCode classes")
    .sort({ subjectName: 1 });

  const taughtSubjectIds = subjects.map((subject) => subject._id);

  const subjectLinkedClassIds = uniqueObjectIds(
    subjects.flatMap((subject) => subject.classes || [])
  );

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
  //    + classes of students taking those subjects.
  const seedQuery = {
    $or: [{ assignedTeacher: teacherId }],
  };

  const linkedClassIds = uniqueObjectIds([
    ...subjectLinkedClassIds,
    ...studentSubjectClassIds,
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
    const attendanceStudentIds = await Attendance.distinct("student", {
      class: { $in: classIds },
    });
    if (attendanceStudentIds.length > 0) {
      studentQuery.$or.push({ _id: { $in: attendanceStudentIds } });
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

  return {
    teacher,
    classes,
    subjects,
    classIds,
    classIdStrings: classIds.map((id) => id.toString()),
    classLabels: uniqueClassLabels(classes),
    subjectIds,
    subjectIdStrings: subjectIds.map((id) => id.toString()),
    subjectLabels: subjects.map((item) => item.subjectName).filter(Boolean),
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
  return (
    subject && String(subject.assignedTeacher || "") === String(teacherId)
  );
}
