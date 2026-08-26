/**
 * Keep the latest result per student + subject.
 * Without the student key, teacher/class aggregates incorrectly collapse
 * every learner into one row per subject (average/pass rate look wrong).
 */
export function dedupeResults(results) {
  const byKey = new Map();

  for (const result of results) {
    const studentKey =
      result.student?._id?.toString() ||
      result.student?.toString() ||
      result.studentId?.toString() ||
      "self";

    const subjectKey =
      result.exam?.subject?._id?.toString() ||
      result.exam?.subject?.toString() ||
      result.exam?.examName ||
      result._id.toString();

    const key = `${studentKey}::${subjectKey}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, result);
      continue;
    }

    const existingSpecific = existing.exam?.examName?.includes(" - ");
    const currentSpecific = result.exam?.examName?.includes(" - ");

    if (currentSpecific && !existingSpecific) {
      byKey.set(key, result);
      continue;
    }

    if (!currentSpecific && existingSpecific) {
      continue;
    }

    const existingDate = new Date(
      existing.exam?.examDate || existing.createdAt || 0
    );
    const currentDate = new Date(result.exam?.examDate || result.createdAt || 0);

    if (currentDate >= existingDate) {
      byKey.set(key, result);
    }
  }

  return Array.from(byKey.values());
}

export function sortResultsByLatest(results) {
  return [...results].sort((left, right) => {
    const leftDate = new Date(
      left.exam?.examDate || left.updatedAt || left.createdAt || 0
    );
    const rightDate = new Date(
      right.exam?.examDate || right.updatedAt || right.createdAt || 0
    );

    return rightDate - leftDate;
  });
}

export function calculateOverallAverage(results) {
  if (!results.length) return null;

  const total = results.reduce((sum, result) => sum + Number(result.marks || 0), 0);
  return Number((total / results.length).toFixed(2));
}

export function getSubjectName(result) {
  return (
    result.exam?.subject?.subjectName ||
    result.exam?.examName?.split(" - ").pop() ||
    "General"
  );
}
