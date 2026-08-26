import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import {
  dedupeResults,
  sortResultsByLatest,
} from "./studentResults.js";
import { buildSubjectPerformance } from "./subjectPerformance.js";
import { resolveCommerceSubjectMarks } from "./commerceMarks.js";
import { healExamAnalytics } from "./examAnalytics.js";

/**
 * Shared academic snapshot for every student-facing dashboard
 * (student home, performance tracker, parent child view).
 * Old and newly added students use the same path.
 */
export async function buildStudentAcademicSnapshot(studentProfile) {
  if (!studentProfile?._id) {
    return {
      results: [],
      performanceResults: [],
      subjectPerformance: [],
      latestResult: null,
      currentZScore: null,
    };
  }

  const resultQuery = { student: studentProfile._id };
  const populateExam = {
    path: "exam",
    select: "examName examDate subject class",
    populate: {
      path: "subject",
      select: "subjectName subjectCode",
    },
  };

  let rawResults = await Result.find(resultQuery).populate(populateExam);

  await healExamAnalytics(
    rawResults.map((result) => result.exam?._id || result.exam)
  );

  rawResults = await Result.find(resultQuery).populate(populateExam);

  const results = sortResultsByLatest(dedupeResults(rawResults));
  const performanceResults = sortResultsByLatest(rawResults);

  // Prefer the newest exam that already has a Z-score.
  const latestWithZ = performanceResults.find(
    (result) => result.zScore !== null && result.zScore !== undefined
  );
  const resolvedCurrentZScore =
    latestWithZ?.zScore ??
    results.find(
      (result) => result.zScore !== null && result.zScore !== undefined
    )?.zScore ??
    null;

  if (
    String(studentProfile.currentZScore ?? "") !==
    String(resolvedCurrentZScore ?? "")
  ) {
    await StudentProfile.updateOne(
      { _id: studentProfile._id },
      { $set: { currentZScore: resolvedCurrentZScore } }
    );
    studentProfile.currentZScore = resolvedCurrentZScore;
  }

  let subjectPerformance = buildSubjectPerformance(
    studentProfile.subjects || [],
    results
  );

  // Fill missing Commerce subjects from essay scores when exam marks
  // are not yet published for every subject.
  const hasAllCommerce = ["account", "business", "economic"].every((keyword) =>
    subjectPerformance.some((item) =>
      String(item.subject || "")
        .toLowerCase()
        .includes(keyword)
    )
  );

  if (!hasAllCommerce) {
    const commerceMarks = await resolveCommerceSubjectMarks(
      studentProfile._id
    );
    const byName = new Map(
      subjectPerformance.map((item) => [
        String(item.subject || "").toLowerCase(),
        item,
      ])
    );

    for (const item of commerceMarks.performance) {
      const key = String(item.subject || "").toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, {
          subject: item.subject,
          marks: item.marks,
          source: item.source,
        });
      }
    }

    subjectPerformance = Array.from(byName.values());
  }

  return {
    results,
    performanceResults,
    subjectPerformance,
    latestResult: results[0] || null,
    currentZScore: resolvedCurrentZScore,
  };
}
