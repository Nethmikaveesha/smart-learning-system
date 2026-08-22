import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import StudentProfile from "../models/StudentProfile.js";
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
 * Resolve the classes, subjects, and students belonging to one teacher.
 * Includes:
 * - classes where the teacher is the assigned class teacher
 * - classes linked to subjects the teacher teaches
 * - classes that contain students taking the teacher's subjects
 * - duplicate class rows with the same name + academic year
 */
export async function getTeacherScope(teacherId) {
  const teacher = await User.findById(teacherId).select("fullName email");

  const taughtSubjects = await Subject.find({ assignedTeacher: teacherId }).select(
    "subjectName subjectCode classes"
  );
  const taughtSubjectIds = taughtSubjects.map((subject) => subject._id);

  const subjectLinkedClassIds = uniqueObjectIds(
    taughtSubjects.flatMap((subject) => subject.classes || [])
  );

  const studentsTakingSubjects =
    taughtSubjectIds.length > 0
      ? await StudentProfile.find({
          subjects: { $in: taughtSubjectIds },
        }).select("class")
      : [];

  const studentClassIds = uniqueObjectIds(
    studentsTakingSubjects.map((profile) => profile.class)
  );

  const seedQuery = {
    $or: [{ assignedTeacher: teacherId }],
  };

  const linkedIds = uniqueObjectIds([
    ...subjectLinkedClassIds,
    ...studentClassIds,
  ]);

  if (linkedIds.length > 0) {
    seedQuery.$or.push({ _id: { $in: linkedIds } });
  }

  const seedClasses = await Class.find(seedQuery).select(
    "className academicYear gradeLevel"
  );

  const expandedClassIds = await expandClassIdsWithNameYearTwins(seedClasses);

  const classes =
    expandedClassIds.length > 0
      ? await Class.find({ _id: { $in: expandedClassIds } })
          .select("className academicYear gradeLevel")
          .sort({ gradeLevel: 1, className: 1 })
      : [];

  const classIds = classes.map((item) => item._id);

  const studentQuery = { $or: [] };
  if (classIds.length > 0) {
    studentQuery.$or.push({ class: { $in: classIds } });
  }
  if (taughtSubjectIds.length > 0) {
    studentQuery.$or.push({ subjects: { $in: taughtSubjectIds } });
  }

  const students =
    studentQuery.$or.length > 0
      ? await StudentProfile.find(studentQuery).select(
          "_id studentId riskStatus attendancePercentage class subjects parent"
        )
      : [];

  const studentSubjectIds = [
    ...new Set(
      students.flatMap((student) =>
        (student.subjects || []).map((subjectId) => subjectId.toString())
      )
    ),
  ];

  const subjectQuery = { $or: [{ assignedTeacher: teacherId }] };
  if (studentSubjectIds.length > 0) {
    subjectQuery.$or.push({ _id: { $in: studentSubjectIds } });
  }

  const subjects = await Subject.find(subjectQuery).select(
    "subjectName subjectCode"
  );

  const subjectIds = subjects.map((item) => item._id);
  const studentIds = students.map((student) => student._id);

  return {
    teacher,
    classes,
    subjects,
    classIds,
    classIdStrings: classIds.map((id) => id.toString()),
    subjectIds,
    subjectIdStrings: subjectIds.map((id) => id.toString()),
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
