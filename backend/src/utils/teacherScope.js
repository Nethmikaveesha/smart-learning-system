import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import StudentProfile from "../models/StudentProfile.js";
import User from "../models/User.js";

/**
 * Resolve the classes, subjects, and students belonging to one teacher.
 * Used to scope teacher dashboard APIs so staff only see their own work.
 */
export async function getTeacherScope(teacherId) {
  const teacher = await User.findById(teacherId).select("fullName email");
  const classes = await Class.find({ assignedTeacher: teacherId }).select(
    "className academicYear gradeLevel"
  );

  const classIds = classes.map((item) => item._id);

  const students = await StudentProfile.find({
    class: { $in: classIds },
  }).select("_id studentId riskStatus attendancePercentage class subjects parent");

  const studentSubjectIds = [
    ...new Set(
      students.flatMap((student) =>
        (student.subjects || []).map((subjectId) => subjectId.toString())
      )
    ),
  ];

  const subjects = await Subject.find({
    $or: [{ assignedTeacher: teacherId }, { _id: { $in: studentSubjectIds } }],
  }).select("subjectName subjectCode");

  const subjectIds = subjects.map((item) => item._id);
  const studentIds = students.map((student) => student._id);
  const subjectIdStrings = subjectIds.map((id) => id.toString());
  const classIdStrings = classIds.map((id) => id.toString());
  const studentIdStrings = studentIds.map((id) => id.toString());

  return {
    teacher,
    classes,
    subjects,
    classIds,
    classIdStrings,
    subjectIds,
    subjectIdStrings,
    students,
    studentIds,
    studentIdStrings,
  };
}

export async function assertTeacherOwnsClass(teacherId, classId) {
  if (!classId) return false;
  const classRecord = await Class.findById(classId).select("assignedTeacher");
  return (
    classRecord &&
    String(classRecord.assignedTeacher || "") === String(teacherId)
  );
}

export async function assertTeacherOwnsSubject(teacherId, subjectId) {
  if (!subjectId) return false;
  const subject = await Subject.findById(subjectId).select("assignedTeacher");
  return (
    subject && String(subject.assignedTeacher || "") === String(teacherId)
  );
}
