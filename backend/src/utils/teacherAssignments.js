import mongoose from "mongoose";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

/**
 * Persist admin teacher ↔ class ↔ subject links without clobbering co-teachers.
 *
 * Class.assignedTeacher is singular (one "class teacher"). Commerce subjects
 * (ACC/BS/ECO) often share the same class, so we also store the class on
 * Subject.classes for that teacher's subject. The admin teacher list can then
 * show the admin-assigned class even when another teacher owns
 * Class.assignedTeacher.
 */
export async function syncTeacherClassSubjectAssignment({
  teacherId,
  classId,
  subjectId,
}) {
  if (!teacherId || !mongoose.Types.ObjectId.isValid(String(teacherId))) {
    return;
  }

  const tid = teacherId;
  const hasSubject =
    subjectId && mongoose.Types.ObjectId.isValid(String(subjectId));
  const hasClass =
    classId && mongoose.Types.ObjectId.isValid(String(classId));

  let classDoc = null;
  if (hasClass) {
    classDoc = await Class.findById(classId);
    if (!classDoc) return;
  }

  if (hasSubject) {
    const subjectUpdate = { assignedTeacher: tid };
    if (classDoc) {
      // Admin form is single-class; replace so reassignment does not accumulate.
      subjectUpdate.classes = [classDoc._id];
    }
    await Subject.findByIdAndUpdate(subjectId, subjectUpdate);
  } else if (classDoc) {
    // Class-only update: attach to every subject this teacher already owns.
    const owned = await Subject.find({ assignedTeacher: tid }).select("_id");
    await Promise.all(
      owned.map((s) =>
        Subject.findByIdAndUpdate(s._id, { classes: [classDoc._id] })
      )
    );
  }

  if (!classDoc) return;

  // Clear this teacher's class-teacher pointer on other classes only.
  await Class.updateMany(
    { assignedTeacher: tid, _id: { $ne: classDoc._id } },
    { $unset: { assignedTeacher: "" } }
  );

  // Only set the singular class-teacher pointer when free or already ours.
  if (
    !classDoc.assignedTeacher ||
    String(classDoc.assignedTeacher) === String(tid)
  ) {
    classDoc.assignedTeacher = tid;
    await classDoc.save();
  }
}

/**
 * Admin teacher rows: subject codes + class names from admin links only
 * (Class.assignedTeacher and Subject.classes for that teacher's subjects).
 */
export async function buildTeachersWithAssignments() {
  const teachers = await User.find({ role: "teacher" })
    .select("-password")
    .sort({ createdAt: -1 });

  const teacherIds = teachers.map((t) => t._id);

  const [classTeacherRows, subjects] = await Promise.all([
    Class.find({ assignedTeacher: { $in: teacherIds } })
      .select("_id className academicYear assignedTeacher")
      .lean(),
    Subject.find({ assignedTeacher: { $in: teacherIds } })
      .select("_id subjectName subjectCode assignedTeacher classes")
      .lean(),
  ]);

  const subjectClassIds = [
    ...new Set(
      subjects.flatMap((s) => (s.classes || []).map((c) => String(c)))
    ),
  ];

  const subjectClasses =
    subjectClassIds.length > 0
      ? await Class.find({ _id: { $in: subjectClassIds } })
          .select("_id className academicYear")
          .lean()
      : [];

  const classById = new Map();
  [...classTeacherRows, ...subjectClasses].forEach((c) => {
    classById.set(String(c._id), c);
  });

  const subjectsByTeacher = new Map();
  subjects.forEach((s) => {
    const key = String(s.assignedTeacher);
    if (!subjectsByTeacher.has(key)) subjectsByTeacher.set(key, []);
    subjectsByTeacher.get(key).push(s);
  });

  const classTeacherByTeacher = new Map();
  classTeacherRows.forEach((c) => {
    const key = String(c.assignedTeacher);
    if (!classTeacherByTeacher.has(key)) classTeacherByTeacher.set(key, []);
    classTeacherByTeacher.get(key).push(c);
  });

  return teachers.map((teacher) => {
    const tid = String(teacher._id);
    const teacherSubjects = subjectsByTeacher.get(tid) || [];
    const fromClassTeacher = classTeacherByTeacher.get(tid) || [];

    const seen = new Set(fromClassTeacher.map((c) => String(c._id)));
    const fromSubjectClasses = [];
    teacherSubjects.forEach((s) => {
      (s.classes || []).forEach((cid) => {
        const id = String(cid);
        if (seen.has(id)) return;
        const cls = classById.get(id);
        if (!cls) return;
        seen.add(id);
        fromSubjectClasses.push(cls);
      });
    });

    const allClasses = [...fromClassTeacher, ...fromSubjectClasses];
    const uniqueNames = [
      ...new Set(allClasses.map((c) => c.className).filter(Boolean)),
    ];

    return {
      ...teacher.toObject(),
      assignedSubjectCode:
        teacherSubjects
          .map((s) => s.subjectCode || s.subjectName)
          .filter(Boolean)
          .join(", ") || "N/A",
      assignedClassName: uniqueNames.join(", ") || "N/A",
    };
  });
}
