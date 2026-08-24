import Result from "../models/Result.js";

/**
 * Recalculate rank + Z-score for every result in one exam.
 * Rank 1 = highest marks.
 * Z-score needs at least 2 students in the same exam; otherwise it is null
 * (a lone 0.00 looks like "average" and misleads teachers/students).
 */
export async function recalculateExamAnalytics(examId) {
  const results = await Result.find({ exam: examId }).sort({ marks: -1 });

  if (results.length === 0) {
    return null;
  }

  // Single-student exam: rank is 1, Z-score is not meaningful yet.
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
  };
}

/**
 * Heal Z-score/rank for the given exam ids (used when reading dashboards).
 */
export async function healExamAnalytics(examIds = []) {
  const uniqueIds = [...new Set(examIds.filter(Boolean).map(String))];

  for (const examId of uniqueIds) {
    await recalculateExamAnalytics(examId);
  }
}
