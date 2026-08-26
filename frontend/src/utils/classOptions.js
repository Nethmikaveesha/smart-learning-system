/** Stable identity for a class roster row (name + year + stream). */
export function getClassIdentityKey(classItem) {
  return [
    String(classItem?.className || "")
      .trim()
      .toLowerCase(),
    String(classItem?.academicYear || "").trim(),
    String(classItem?.stream || "Commerce")
      .trim()
      .toLowerCase(),
  ].join("::");
}

/**
 * Remove duplicate class rows that share name + academic year + stream.
 * Prefers active records, then the most recently updated one.
 */
export function dedupeClasses(classes = []) {
  const seen = new Map();

  for (const item of classes) {
    if (!item) continue;
    const key = getClassIdentityKey(item);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const itemActive = item.isActive !== false;
    const existingActive = existing.isActive !== false;
    const itemNewer =
      new Date(item.updatedAt || item.createdAt || 0).getTime() >
      new Date(existing.updatedAt || existing.createdAt || 0).getTime();

    if ((itemActive && !existingActive) || (itemActive === existingActive && itemNewer)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    const gradeDiff = Number(a.gradeLevel || 0) - Number(b.gradeLevel || 0);
    if (gradeDiff !== 0) return gradeDiff;
    return String(a.className || "").localeCompare(String(b.className || ""));
  });
}

/** Human-readable class label for dropdowns (includes year to avoid lookalikes). */
export function formatClassSelectLabel(classItem) {
  const name = classItem?.className || "Class";
  const stream = classItem?.stream || "Commerce";
  const year = classItem?.academicYear
    ? ` (${classItem.academicYear})`
    : "";
  return `${name} · ${stream}${year}`;
}

/**
 * Options for forms that store className (+ academicYear separately).
 * Uses Mongo _id as the option value so same className in different years
 * remains selectable without HTML duplicate-value bugs.
 */
export function toClassIdSelectOptions(classes = []) {
  return dedupeClasses(classes).map((classItem) => ({
    value: String(classItem._id),
    label: formatClassSelectLabel(classItem),
  }));
}

/**
 * Options for forms that only store className (e.g. teacher assignment).
 * One option per class name — keeps the newest/active roster row.
 */
export function toClassNameSelectOptions(classes = []) {
  const byName = new Map();

  for (const item of dedupeClasses(classes)) {
    const key = String(item.className || "")
      .trim()
      .toLowerCase();
    if (!key || byName.has(key)) continue;
    byName.set(key, item);
  }

  return Array.from(byName.values()).map((classItem) => ({
    value: classItem.className,
    label: formatClassSelectLabel(classItem),
  }));
}

export function findClassById(classes = [], classId) {
  return classes.find((item) => String(item._id) === String(classId)) || null;
}

export function findClassIdForValues(classes = [], className, academicYear = "") {
  if (!className) return "";

  const normalizedName = String(className).trim().toLowerCase();
  const normalizedYear = String(academicYear || "").trim();
  const unique = dedupeClasses(classes);

  const exact = unique.find(
    (item) =>
      String(item.className || "").trim().toLowerCase() === normalizedName &&
      (!normalizedYear ||
        String(item.academicYear || "").trim() === normalizedYear)
  );

  if (exact) return String(exact._id);

  const byName = unique.find(
    (item) =>
      String(item.className || "").trim().toLowerCase() === normalizedName
  );

  return byName ? String(byName._id) : "";
}
