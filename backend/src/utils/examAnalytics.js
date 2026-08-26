import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import {
  resolveClassTwinIds,
  resolveSubjectTwinIds,
} from "./teacherScope.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Exams that belong to the same Z-score / rank cohort:
 * same exam name + subject twins + class name/grade twins.
 * Prevents duplicate Class/Exam rows from splitting peer groups
 * (common for newly added students vs older seed data).
 */
export async function resolveExamCohortIds(examId) {
  if (!examId) return [];

  const exam = await Exam.findById(examId).select(
    "examName class subject"
  );
  if (!exam) return [examId];

  const [classIds, subjectIds] = await Promise.all([
    resolveClassTwinIds(exam.class, { ignoreYear: true }),
    resolveSubjectTwinIds([exam.subject]),
  ]);

  const name = String(exam.examName || "").trim();
  if (!name) {
    return [exam._id];
  }

  const siblings = await Exam.find({
    subject: {
      $in: subjectIds.length > 0 ? subjectIds : [exam.subject],
    },
    class: {
      $in: classIds.length > 0 ? classIds : [exam.class],
    },
    examName: {
      $regex: `^${escapeRegex(name)}$`,
      $options: "i",
    },
  }).select("_id");

  const ids = [];
  const seen = new Set();
  for (const row of [exam, ...siblings]) {
    const key = String(row._id);
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(row._id);
  }

  return ids.length > 0 ? ids : [exam._id];
}

/**
 * Recalculate rank + Z-score for every result in one exam cohort.
 * Rank 1 = highest marks.
 * Z-score needs at least 2 students in the cohort; otherwise it is null
 * (a lone 0.00 looks like "average" and misleads teachers/students).
 */
export async function recalculateExamAnalytics(examId) {
  const cohortExamIds = await resolveExamCohortIds(examId);
  const results = await Result.find({
    exam: { $in: cohortExamIds },
  }).sort({ marks: -1, createdAt: 1 });

  if (results.length === 0) {
    return null;
  }

  // Single-student cohort: rank is 1, Z-score is not meaningful yet.
  if (results.length < 2) {
    for (const result of results) {
      result.rank = 1;
      result.zScore = null;
      await result.save();
    }

    return {
      mean: Number(Number(results[0].marks).toFixed(2)),
      standardDeviation: null,
      count: 1,
      examIds: cohortExamIds,
    };
  }

  const marksArray = results.map((result) => Number(result.marks));
  const mean =
    marksArray.reduce((sum, mark) => sum + mark, 0) / marksArray.length;
  const variance =
    marksArray.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) /
    marksArray.length;
  const standardDeviation = Math.sqrt(variance);

  for (let i = 0; i < results.length; i++) {
    // All equal marks → sd 0 → every Z-score is 0 (true average standing).
    const zScore =
      standardDeviation === 0
        ? 0
        : Number(((marksArray[i] - mean) / standardDeviation).toFixed(2));

    results[i].zScore = zScore;
    results[i].rank = i + 1;
    await results[i].save();
  }

  return {
    mean: Number(mean.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    count: results.length,
    examIds: cohortExamIds,
  };
}

/**
 * Heal Z-score/rank for the given exam ids (used when reading dashboards).
 * Dedupes cohort roots so twin exam rows are not recalculated repeatedly.
 */
export async function healExamAnalytics(examIds = []) {
  const uniqueIds = [...new Set(examIds.filter(Boolean).map(String))];
  const healedCohorts = new Set();

  for (const examId of uniqueIds) {
    const cohortIds = await resolveExamCohortIds(examId);
    const cohortKey = cohortIds
      .map((id) => String(id))
      .sort()
      .join("|");
    if (healedCohorts.has(cohortKey)) continue;
    healedCohorts.add(cohortKey);
    await recalculateExamAnalytics(examId);
  }
}
