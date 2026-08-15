/**
 * Build subject → latest marks list for dashboards / Commerce risk UI.
 * Prefers linked profile.subjects when present; otherwise derives from exam results.
 */
export function buildSubjectPerformance(subjects = [], results = []) {
  if (Array.isArray(subjects) && subjects.length > 0) {
    return subjects
      .map((subject) => {
        const subjectResult = results.find(
          (result) =>
            result.exam?.subject?._id?.toString() === subject._id.toString() ||
            result.exam?.subject?.toString() === subject._id.toString()
        );

        return {
          subject: subject.subjectName,
          marks: subjectResult ? subjectResult.marks : null,
        };
      })
      .filter((item) => item.marks !== null);
  }

  const latestBySubject = new Map();

  for (const result of results) {
    const subjectName =
      result.exam?.subject?.subjectName ||
      result.exam?.subject?.name ||
      null;

    if (!subjectName || latestBySubject.has(subjectName)) continue;

    latestBySubject.set(subjectName, {
      subject: subjectName,
      marks: result.marks,
    });
  }

  return Array.from(latestBySubject.values());
}
