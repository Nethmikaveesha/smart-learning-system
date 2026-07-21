/**
 * Infer A/L grade (12 or 13) from a class name like "13 Commerce A".
 * Returns null when the name does not contain a clear grade.
 */
export const inferGradeLevel = (className = "") => {
  const match = String(className).match(/\b(12|13)\b/);
  return match ? Number(match[1]) : null;
};

export const normalizeGradeLevel = (value, className = "") => {
  const numeric = Number(value);
  if (numeric === 12 || numeric === 13) return numeric;

  return inferGradeLevel(className);
};
