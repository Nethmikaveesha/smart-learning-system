const COMMERCE_SUBJECT_ORDER = {
  accounting: 1,
  "business studies": 2,
  economics: 3,
};

export function getEssaySubjectLabel(paper) {
  if (!paper) return "Other";

  const fromObject =
    paper.subject?.subjectName ||
    paper.subject?.subjectCode ||
    "";
  if (fromObject) return String(fromObject).trim();

  if (typeof paper.subject === "string" && paper.subject.trim()) {
    return paper.subject.trim();
  }

  if (typeof paper.subjectName === "string" && paper.subjectName.trim()) {
    return paper.subjectName.trim();
  }

  return "Other";
}

export function commerceSubjectRank(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase();

  if (COMMERCE_SUBJECT_ORDER[key] != null) {
    return COMMERCE_SUBJECT_ORDER[key];
  }

  if (key.includes("account")) return 1;
  if (key.includes("business")) return 2;
  if (key.includes("econ")) return 3;
  if (key === "other" || !key) return 99;
  return 50;
}

/**
 * Accounting → Business Studies → Economics, then oldest → newest.
 */
export function sortEssayPapersAscending(papers = []) {
  return [...(Array.isArray(papers) ? papers : [])].sort((a, b) => {
    const aSubject = getEssaySubjectLabel(a);
    const bSubject = getEssaySubjectLabel(b);
    const rankDiff =
      commerceSubjectRank(aSubject) - commerceSubjectRank(bSubject);
    if (rankDiff !== 0) return rankDiff;

    const nameDiff = aSubject.localeCompare(bSubject, undefined, {
      sensitivity: "base",
    });
    if (nameDiff !== 0) return nameDiff;

    const aTime = new Date(a.createdAt || 0).getTime() || 0;
    const bTime = new Date(b.createdAt || 0).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;

    return String(a._id || a.id || "").localeCompare(String(b._id || b.id || ""));
  });
}
