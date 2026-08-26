import Subject from "../models/Subject.js";

export const COMMERCE_SUBJECTS = [
  { subjectName: "Accounting", subjectCode: "ACC101" },
  { subjectName: "Business Studies", subjectCode: "BS101" },
  { subjectName: "Economics", subjectCode: "ECO101" },
];

/** Fixed A/L Commerce subject catalog for admin create/edit forms. */
export function getCommerceSubjectCatalog() {
  return COMMERCE_SUBJECTS.map((item) => ({ ...item }));
}

/**
 * Ensure the three A/L Commerce core subjects exist and return their ObjectIds.
 * Used when registering or updating Commerce stream students.
 */
export async function ensureCommerceSubjectIds() {
  const ids = [];

  for (const item of COMMERCE_SUBJECTS) {
    let subject = await Subject.findOne({ subjectCode: item.subjectCode });

    if (!subject) {
      subject = await Subject.create({
        subjectName: item.subjectName,
        subjectCode: item.subjectCode,
      });
    }

    ids.push(subject._id);
  }

  // Keep co-teacher membership in sync with User.assignedSubject and the
  // singular board lead pointer (safe, additive only).
  try {
    const User = (await import("../models/User.js")).default;
    const linkedTeachers = await User.find({
      role: "teacher",
      assignedSubject: { $in: ids },
    }).select("_id assignedSubject");

    await Promise.all(
      linkedTeachers.map((teacher) =>
        Subject.updateOne(
          { _id: teacher.assignedSubject },
          { $addToSet: { assignedTeachers: teacher._id } }
        )
      )
    );

    const leadSubjects = await Subject.find({
      _id: { $in: ids },
      assignedTeacher: { $ne: null },
    }).select("_id assignedTeacher");

    await Promise.all(
      leadSubjects.map((subject) =>
        Subject.updateOne(
          { _id: subject._id },
          { $addToSet: { assignedTeachers: subject.assignedTeacher } }
        )
      )
    );
  } catch (syncError) {
    console.warn(
      "ensureCommerceSubjectIds co-teacher sync skipped:",
      syncError.message
    );
  }

  return ids;
}
