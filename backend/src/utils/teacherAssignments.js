import mongoose from "mongoose";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

/**
 * Persist admin teacher ↔ class ↔ subject links without clobbering co-teachers.
 *
 * Subject.assignedTeacher and Class.assignedTeacher are singular. Commerce
 * teachers often share the same subject code or class, so the admin-selected
 * links are also stored on User.assignedSubject / User.assignedClass (source
 * of truth for the Registered Teachers list). Legacy pointers are only set
 * when free or already owned by this teacher.
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

  const userUpdate = {};

  let classDoc = null;
  if (hasClass) {
    classDoc = await Class.findById(classId);
    if (classDoc) {
      userUpdate.assignedClass = classDoc._id;
    }
  }

  let subjectDoc = null;
  if (hasSubject) {
    subjectDoc = await Subject.findById(subjectId);
    if (subjectDoc) {
      userUpdate.assignedSubject = subjectDoc._id;
    }
  }

  if (Object.keys(userUpdate).length > 0) {
    await User.findByIdAndUpdate(tid, userUpdate);
  }

  if (subjectDoc) {
    // Drop legacy subject ownership on other subjects for this teacher.
    await Subject.updateMany(
      { assignedTeacher: tid, _id: { $ne: subjectDoc._id } },
      { $unset: { assignedTeacher: "" } }
    );

    const subjectUpdate = {};

    // Only claim Subject.assignedTeacher when free or already ours.
    if (
      !subjectDoc.assignedTeacher ||
      String(subjectDoc.assignedTeacher) === String(tid)
    ) {
      subjectUpdate.assignedTeacher = tid;
    }

    if (classDoc) {
      // Accumulate classes so co-teachers do not erase each other's links.
      await Subject.findByIdAndUpdate(subjectDoc._id, {
        ...subjectUpdate,
        $addToSet: { classes: classDoc._id },
      });
    } else if (Object.keys(subjectUpdate).length > 0) {
      await Subject.findByIdAndUpdate(subjectDoc._id, subjectUpdate);
    }
  } else if (classDoc) {
    // Class-only: attach onto subjects this teacher already owns (legacy).
    const owned = await Subject.find({ assignedTeacher: tid }).select("_id");
    const fromUser = await User.findById(tid).select("assignedSubject");
    const subjectIds = [
      ...owned.map((s) => s._id),
      ...(fromUser?.assignedSubject ? [fromUser.assignedSubject] : []),
    ];
    const unique = [...new Set(subjectIds.map((id) => String(id)))];
    await Promise.all(
      unique.map((id) =>
        Subject.findByIdAndUpdate(id, { $addToSet: { classes: classDoc._id } })
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
 * Admin teacher rows: prefer User.assignedSubject / User.assignedClass
 * (what Admin selected), with fallbacks to legacy singular pointers.
 */
export async function buildTeachersWithAssignments() {
  const teachers = await User.find({ role: "teacher" })
    .select("-password")
    .populate("assignedSubject", "subjectCode subjectName")
    .populate("assignedClass", "className academicYear")
    .sort({ createdAt: 1 });

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
    const legacySubjects = subjectsByTeacher.get(tid) || [];
    const fromClassTeacher = classTeacherByTeacher.get(tid) || [];

    const seen = new Set(fromClassTeacher.map((c) => String(c._id)));
    const fromSubjectClasses = [];
    legacySubjects.forEach((s) => {
      (s.classes || []).forEach((cid) => {
        const id = String(cid);
        if (seen.has(id)) return;
        const cls = classById.get(id);
        if (!cls) return;
        seen.add(id);
        fromSubjectClasses.push(cls);
      });
    });

    // Prefer explicit admin links stored on the user.
    const userSubject = teacher.assignedSubject;
    const userClass = teacher.assignedClass;

    let subjectCode = "N/A";
    if (userSubject?.subjectCode || userSubject?.subjectName) {
      subjectCode = userSubject.subjectCode || userSubject.subjectName;
    } else if (legacySubjects.length > 0) {
      subjectCode =
        legacySubjects
          .map((s) => s.subjectCode || s.subjectName)
          .filter(Boolean)
          .join(", ") || "N/A";
    }

    let className = "N/A";
    if (userClass?.className) {
      className = userClass.className;
    } else {
      const allClasses = [...fromClassTeacher, ...fromSubjectClasses];
      const uniqueNames = [
        ...new Set(allClasses.map((c) => c.className).filter(Boolean)),
      ];
      className = uniqueNames.join(", ") || "N/A";
    }

    const plain = teacher.toObject();
    // Avoid leaking populated docs as nested objects in the table payload shape.
    delete plain.assignedSubject;
    delete plain.assignedClass;

    return {
      ...plain,
      assignedSubjectId: userSubject?._id
        ? String(userSubject._id)
        : legacySubjects[0]?._id
          ? String(legacySubjects[0]._id)
          : null,
      assignedSubjectCode: subjectCode,
      assignedClassName: className,
    };
  });
}
