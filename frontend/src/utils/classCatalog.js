/** Fixed Commerce class-name options for admin Forms (no API required). */
export const CLASS_NAME_OPTIONS = [
  {
    value: "12 Commerce A",
    label: "12 Commerce A",
    gradeLevel: "12",
  },
  {
    value: "12 Commerce B",
    label: "12 Commerce B",
    gradeLevel: "12",
  },
  {
    value: "13 Commerce A",
    label: "13 Commerce A",
    gradeLevel: "13",
  },
  {
    value: "13 Commerce B",
    label: "13 Commerce B",
    gradeLevel: "13",
  },
];

/** Academic year dropdown options around the current year. */
export function getAcademicYearOptions(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
    (year) => ({
      value: String(year),
      label: String(year),
    })
  );
}

export const ACADEMIC_YEAR_OPTIONS = getAcademicYearOptions();
