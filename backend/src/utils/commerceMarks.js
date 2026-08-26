import Result from "../models/Result.js";
import EssaySubmission from "../models/EssaySubmission.js";

const COMMERCE_SUBJECTS = [
  {
    key: "accounting",
    label: "Accounting",
    keywords: ["accounting", "acc101", "acc"],
  },
  {
    key: "business",
    label: "Business Studies",
    keywords: ["business studies", "business", "bs101", "bs"],
  },
  {
    key: "economics",
    label: "Economics",
    keywords: ["economics", "eco101", "eco"],
  },
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function matchesKeywords(haystack, keywords) {
  const text = normalizeText(haystack);
  if (!text) return false;
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function toPercentScore(marks, maxMarks = 100) {
  const score = Number(marks);
  const max = Number(maxMarks) || 100;
  if (!Number.isFinite(score)) return null;
  if (!Number.isFinite(max) || max <= 0) return null;

  const percent = (score / max) * 100;
  if (!Number.isFinite(percent)) return null;
  return Number(Math.max(0, Math.min(100, percent)).toFixed(2));
}

function resultHaystack(result) {
  const subject = result?.exam?.subject;
  return [
    subject?.subjectName,
    subject?.name,
    subject?.subjectCode,
    result?.exam?.examName,
  ]
    .filter(Boolean)
    .join(" ");
}

function essayHaystack(submission) {
  const subject = submission?.question?.subject;
  return [subject?.subjectName, subject?.subjectCode, subject?.name]
    .filter(Boolean)
    .join(" ");
}

/**
 * Resolve latest Commerce subject marks for a student.
 * Prefers Marks Management exam results; falls back to essay submission
 * scores (normalized to 0–100) so Risk Assessment works after essays.
 */
export async function resolveCommerceSubjectMarks(studentProfileId) {
  const empty = {
    accounting: null,
    business: null,
    economics: null,
    sources: {
      accounting: null,
      business: null,
      economics: null,
    },
    performance: [],
  };

  if (!studentProfileId) return empty;

  const results = await Result.find({ student: studentProfileId })
    .populate({
      path: "exam",
      select: "examName examDate",
      populate: {
        path: "subject",
        select: "subjectName subjectCode name",
      },
    })
    .sort({ createdAt: -1 })
    .limit(80);

  const essays = await EssaySubmission.find({ student: studentProfileId })
    .populate({
      path: "question",
      select: "question maxMarks subject",
      populate: {
        path: "subject",
        select: "subjectName subjectCode name",
      },
    })
    .sort({ createdAt: -1 })
    .limit(40);

  const resolved = {
    accounting: null,
    business: null,
    economics: null,
  };
  const sources = {
    accounting: null,
    business: null,
    economics: null,
  };

  for (const subject of COMMERCE_SUBJECTS) {
    const examHit = results.find((result) =>
      matchesKeywords(resultHaystack(result), subject.keywords)
    );

    if (examHit && examHit.marks != null) {
      const score = toPercentScore(examHit.marks, 100);
      if (score != null) {
        resolved[subject.key] = score;
        sources[subject.key] = "exam";
        continue;
      }
    }

    const essayHit = essays.find((submission) =>
      matchesKeywords(essayHaystack(submission), subject.keywords)
    );

    if (essayHit) {
      const rawMarks = essayHit.finalMarks ?? essayHit.marks;
      const maxMarks =
        essayHit.question?.maxMarks ||
        essayHit.markBreakdown?.maxMarks ||
        100;
      const score = toPercentScore(rawMarks, maxMarks);
      if (score != null) {
        resolved[subject.key] = score;
        sources[subject.key] = "essay";
      }
    }
  }

  const performance = COMMERCE_SUBJECTS.map((subject) => ({
    subject: subject.label,
    marks: resolved[subject.key],
    source: sources[subject.key],
  })).filter((item) => item.marks != null);

  return {
    ...resolved,
    sources,
    performance,
  };
}

export { COMMERCE_SUBJECTS };
