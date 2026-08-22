/**
 * Fixed A/L Commerce class-name catalog for admin create/edit forms.
 * Keeps naming consistent (avoids "12 commerce" / "12 Commerce A" duplicates).
 */
export const COMMERCE_CLASS_NAMES = [
  { className: "12 Commerce A", gradeLevel: 12, stream: "Commerce" },
  { className: "12 Commerce B", gradeLevel: 12, stream: "Commerce" },
  { className: "13 Commerce A", gradeLevel: 13, stream: "Commerce" },
  { className: "13 Commerce B", gradeLevel: 13, stream: "Commerce" },
];

/** Academic years around the current calendar year for dropdowns. */
export function getAcademicYearOptions(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
    (year) => ({
      value: String(year),
      label: String(year),
    })
  );
}

export function getCommerceClassCatalog(referenceDate = new Date()) {
  return {
    classNames: COMMERCE_CLASS_NAMES.map((item) => ({ ...item })),
    academicYears: getAcademicYearOptions(referenceDate),
  };
}
