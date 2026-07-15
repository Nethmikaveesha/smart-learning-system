import EssaySubmission from "../models/EssaySubmission.js";
import Subject from "../models/Subject.js";

export function normalizeLabel(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " ")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatLabel(value = "") {
  const normalized = normalizeLabel(value);
  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function aggregateRawLabels(values = []) {
  const counts = new Map();

  values.forEach((value) => {
    const key = normalizeLabel(value);
    if (!key) return;

    const existing = counts.get(key) || {
      label: formatLabel(value),
      count: 0,
    };

    existing.count += 1;
    counts.set(key, existing);
  });

  return Array.from(counts.values()).sort((left, right) => right.count - left.count);
}

export function buildTopicSummary({
  totalSubmissions,
  weakTopics,
  missingConcepts,
  strongAreas,
}) {
  return {
    essaysAnalysed: totalSubmissions,
    topWeakTopic: weakTopics[0]?.label || null,
    mostMissingConcept: missingConcepts[0]?.label || null,
    strongestArea: strongAreas[0]?.label || null,
    previewWeakTopics: weakTopics.slice(0, 3),
    previewMissingConcepts: missingConcepts.slice(0, 3),
    previewStrongAreas: strongAreas.slice(0, 3),
  };
}

export async function buildTopicAnalytics(subjectIds = [], subjectId = null) {
  const subjectIdStrings = subjectIds.map((id) => id.toString());

  const submissions = await EssaySubmission.find({
    "topicAnalysis.missingConcepts": { $exists: true },
  }).populate({
    path: "question",
    select: "subject",
    populate: {
      path: "subject",
      select: "subjectName",
    },
  });

  const scopedSubmissions = submissions.filter((submission) => {
    const questionSubjectId =
      submission.question?.subject?._id?.toString() ||
      submission.question?.subject?.toString();

    if (!questionSubjectId) return false;

    if (subjectId) {
      return questionSubjectId === subjectId.toString();
    }

    if (subjectIdStrings.length === 0) return true;

    return subjectIdStrings.includes(questionSubjectId);
  });

  const weakTopicsRaw = [];
  const missingConceptsRaw = [];
  const strongAreasRaw = [];

  scopedSubmissions.forEach((submission) => {
    const analysis = submission.topicAnalysis;
    if (!analysis) return;

    weakTopicsRaw.push(...(analysis.weakTopics || []));
    missingConceptsRaw.push(...(analysis.missingConcepts || []));
    strongAreasRaw.push(...(analysis.strongAreas || []));
  });

  const weakTopics = aggregateRawLabels(weakTopicsRaw).map((item) => ({
    topic: item.label,
    label: item.label,
    count: item.count,
  }));
  const missingConcepts = aggregateRawLabels(missingConceptsRaw).map((item) => ({
    concept: item.label,
    label: item.label,
    count: item.count,
  }));
  const strongAreas = aggregateRawLabels(strongAreasRaw).map((item) => ({
    area: item.label,
    label: item.label,
    count: item.count,
  }));

  const selectedSubject =
    subjectId && (await Subject.findById(subjectId).select("subjectName subjectCode"));

  return {
    totalSubmissions: scopedSubmissions.length,
    weakTopics,
    missingConcepts,
    strongAreas,
    summary: buildTopicSummary({
      totalSubmissions: scopedSubmissions.length,
      weakTopics,
      missingConcepts,
      strongAreas,
    }),
    selectedSubject,
  };
}
