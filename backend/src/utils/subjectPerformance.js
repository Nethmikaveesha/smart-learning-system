/**
 * Build subject → latest marks list for dashboards / Commerce risk UI.
 * Matches by subject id, code, or name so duplicate Commerce subject
 * documents still resolve (display-only; does not change stored results).
 */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function resultSubjectMeta(result) {
  const subjectDoc = result?.exam?.subject;
  const subjectName =
    subjectDoc?.subjectName ||
    subjectDoc?.name ||
    null;
  const subjectCode = subjectDoc?.subjectCode || null;
  const subjectId =
    subjectDoc?._id?.toString() ||
    (typeof subjectDoc === "string" || typeof subjectDoc === "object"
      ? subjectDoc?.toString?.()
      : null);

  // Fallback: "Term Test 1 - Accounting"
  const fromExamName =
    !subjectName && result?.exam?.examName?.includes(" - ")
      ? result.exam.examName.split(" - ").pop().trim()
      : null;

  return {
    subjectId: subjectId && subjectId !== "[object Object]" ? subjectId : null,
    subjectCode,
    subjectName: subjectName || fromExamName,
  };
}

function collectLatestMarksByKey(results = []) {
  const latestByKey = new Map();

  for (const result of results) {
    if (result?.marks == null || Number.isNaN(Number(result.marks))) continue;

    const meta = resultSubjectMeta(result);
    const label = meta.subjectName || meta.subjectCode || "Subject";
    const keys = [
      meta.subjectId,
      normalizeKey(meta.subjectCode),
      normalizeKey(meta.subjectName),
    ].filter(Boolean);

    for (const key of keys) {
      if (!latestByKey.has(key)) {
        latestByKey.set(key, {
          subject: label,
          marks: Number(result.marks),
        });
      }
    }
  }

  return latestByKey;
}

function findMarkForSubject(subject, latestByKey) {
  const id = subject?._id?.toString();
  const code = normalizeKey(subject?.subjectCode);
  const name = normalizeKey(subject?.subjectName);

  if (id && latestByKey.has(id)) return latestByKey.get(id);
  if (code && latestByKey.has(code)) return latestByKey.get(code);
  if (name && latestByKey.has(name)) return latestByKey.get(name);

  // Loose name match: "Accounting" ↔ "Financial Accounting"
  if (name) {
    for (const [key, value] of latestByKey.entries()) {
      if (key.includes(name) || name.includes(key) || value.subject?.toLowerCase().includes(name)) {
        return value;
      }
    }
  }

  return null;
}

export function buildSubjectPerformance(subjects = [], results = []) {
  const latestByKey = collectLatestMarksByKey(results);

  if (Array.isArray(subjects) && subjects.length > 0) {
    return subjects
      .map((subject) => {
        const hit = findMarkForSubject(subject, latestByKey);
        return {
          subject: subject.subjectName,
          subjectCode: subject.subjectCode || "",
          marks: hit ? hit.marks : null,
        };
      })
      .filter((item) => item.marks !== null);
  }

  const byLabel = new Map();
  for (const item of latestByKey.values()) {
    const labelKey = normalizeKey(item.subject);
    if (!labelKey || byLabel.has(labelKey)) continue;
    byLabel.set(labelKey, item);
  }

  return Array.from(byLabel.values());
}
