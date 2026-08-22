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

  return ids;
}
