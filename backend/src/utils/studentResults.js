export function dedupeResults(results) {
  const bySubject = new Map();

  for (const result of results) {
    const subjectKey =
      result.exam?.subject?._id?.toString() ||
      result.exam?.subject?.toString() ||
      result.exam?.examName ||
      result._id.toString();

    const existing = bySubject.get(subjectKey);

    if (!existing) {
      bySubject.set(subjectKey, result);
      continue;
    }

    const existingSpecific = existing.exam?.examName?.includes(" - ");
    const currentSpecific = result.exam?.examName?.includes(" - ");

    if (currentSpecific && !existingSpecific) {
      bySubject.set(subjectKey, result);
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
      bySubject.set(subjectKey, result);
    }
  }

  return Array.from(bySubject.values());
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
