import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import {
  resolveClassTwinIds,
  resolveSubjectTwinIds,
} from "./teacherScope.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Collapse spacing/dashes and leading zeros so twin labels still match. */
export function normalizeExamNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\b0+(\d)/g, "$1")
    .trim();
}

/**
 * Family key ignores the subject suffix:
 * "Term Test 03- Econ" and "Term Test 3 - Economics" → "term test 3"
 */
export function examNameFamilyKey(name) {
  const normalized = normalizeExamNameKey(name);
  const withoutSubject = normalized
    .replace(
      /-(accounting|business(?:\s*studies)?|economics?|econ)\b.*$/i,
      ""
    )
    .replace(/[-–—]+$/g, "")
    .trim();

  return withoutSubject.replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueIds(ids = []) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (!id) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

async function loadExamScope(examId) {
  const exam = await Exam.findById(examId).select(
    "examName class subject examDate"
  );
  if (!exam) return null;

  const [classIds, subjectIds] = await Promise.all([
    resolveClassTwinIds(exam.class, { ignoreYear: true }),
    resolveSubjectTwinIds([exam.subject]),
  ]);

  return {
    exam,
    classIds: classIds.length > 0 ? classIds : [exam.class],
    subjectIds: subjectIds.length > 0 ? subjectIds : [exam.subject],
  };
}

async function findScopeExams(scope) {
  return Exam.find({
    subject: { $in: scope.subjectIds },
    class: { $in: scope.classIds },
  }).select("_id examName examDate");
}

async function resolveExactNameExamIds(scope) {
  const name = String(scope.exam.examName || "").trim();
  if (!name) return [scope.exam._id];

  const siblings = await Exam.find({
    subject: { $in: scope.subjectIds },
    class: { $in: scope.classIds },
    examName: {
      $regex: `^${escapeRegex(name)}$`,
      $options: "i",
    },
  }).select("_id");

  return uniqueIds([scope.exam._id, ...siblings.map((row) => row._id)]);
}

/**
 * Progressive peer exam set for Z-score:
 * 1) exact exam name
 * 2) same normalized/family name
 * 3) same subject+class within ±21 days
 * 4) all subject+class exams (display/standing fallback only)
 */
export async function resolveExamCohort(examId) {
  if (!examId) {
    return { examIds: [], tier: "none", writeAllPeers: false };
  }

  const scope = await loadExamScope(examId);
  if (!scope) {
    return { examIds: [examId], tier: "exact", writeAllPeers: true };
  }

  const scopeExams = await findScopeExams(scope);
  const exactIds = await resolveExactNameExamIds(scope);
  const exactKey = normalizeExamNameKey(scope.exam.examName);
  const familyKey = examNameFamilyKey(scope.exam.examName);

  const exactCount = await Result.countDocuments({ exam: { $in: exactIds } });
  if (exactCount >= 2) {
    return { examIds: exactIds, tier: "exact", writeAllPeers: true };
  }

  if (familyKey) {
    const byFamily = scopeExams.filter(
      (row) => examNameFamilyKey(row.examName) === familyKey
    );
    const familyIds = uniqueIds(byFamily.map((row) => row._id));
    if (familyIds.length > 0) {
      const familyCount = await Result.countDocuments({
        exam: { $in: familyIds },
      });
      if (familyCount >= 2) {
        return { examIds: familyIds, tier: "family", writeAllPeers: true };
      }
    }
  }

  if (scope.exam.examDate) {
    const center = new Date(scope.exam.examDate).getTime();
    if (!Number.isNaN(center)) {
      const windowMs = 21 * 24 * 60 * 60 * 1000;
      const byDate = scopeExams.filter((row) => {
        if (!row.examDate) return false;
        const t = new Date(row.examDate).getTime();
        return !Number.isNaN(t) && Math.abs(t - center) <= windowMs;
      });
      const dateIds = uniqueIds(byDate.map((row) => row._id));
      if (dateIds.length > 0) {
        const dateCount = await Result.countDocuments({
          exam: { $in: dateIds },
        });
        if (dateCount >= 2) {
          return { examIds: dateIds, tier: "date", writeAllPeers: true };
        }
      }
    }
  }

  const subjectIds = uniqueIds(scopeExams.map((row) => row._id));
  return {
    examIds: subjectIds.length > 0 ? subjectIds : exactIds,
    exactIds,
    tier: "subject",
    writeAllPeers: false,
  };
}

/** Back-compat helper used by heal dedupe. */
export async function resolveExamCohortIds(examId) {
  const cohort = await resolveExamCohort(examId);
  return cohort.examIds;
}

function computeAnalytics(results) {
  const marksArray = results.map((result) => Number(result.marks));
  const mean =
    marksArray.reduce((sum, mark) => sum + mark, 0) / marksArray.length;
  const variance =
    marksArray.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) /
    marksArray.length;
  const standardDeviation = Math.sqrt(variance);

  return { marksArray, mean, standardDeviation };
}

function zScoreForMark(mark, mean, standardDeviation) {
  if (standardDeviation === 0) return 0;
  return Number(((Number(mark) - mean) / standardDeviation).toFixed(2));
}

/**
 * Recalculate rank + Z-score.
 * Rank stays within the exact exam-name group.
 * Z-score uses the progressive peer cohort so newly added students still
 * get a standing when classmates were marked on nearby/twin exams.
 */
export async function recalculateExamAnalytics(examId) {
  const scope = await loadExamScope(examId);
  if (!scope) return null;

  const cohort = await resolveExamCohort(examId);
  const exactIds = cohort.exactIds || (await resolveExactNameExamIds(scope));

  const examResults = await Result.find({
    exam: { $in: exactIds },
  }).sort({ marks: -1, createdAt: 1 });

  if (examResults.length === 0) {
    return null;
  }

  // Rank within this exam (and exact-name twins) only.
  for (let i = 0; i < examResults.length; i++) {
    examResults[i].rank = i + 1;
  }

  const peerResults = await Result.find({
    exam: { $in: cohort.examIds },
  }).sort({ marks: -1, createdAt: 1 });

  if (peerResults.length < 2) {
    for (const result of examResults) {
      result.zScore = null;
      await result.save();
    }

    return {
      mean: Number(Number(examResults[0].marks).toFixed(2)),
      standardDeviation: null,
      count: examResults.length,
      peerCount: peerResults.length,
      tier: cohort.tier,
      examIds: cohort.examIds,
    };
  }

  const { mean, standardDeviation } = computeAnalytics(peerResults);
  const examResultById = new Map(
    examResults.map((row) => [String(row._id), row])
  );

  if (cohort.writeAllPeers) {
    for (const result of peerResults) {
      result.zScore = zScoreForMark(result.marks, mean, standardDeviation);
      const exact = examResultById.get(String(result._id));
      if (exact) {
        result.rank = exact.rank;
      }
      await result.save();
    }
  } else {
    for (const result of examResults) {
      result.zScore = zScoreForMark(result.marks, mean, standardDeviation);
      await result.save();
    }
  }

  return {
    mean: Number(mean.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    count: examResults.length,
    peerCount: peerResults.length,
    tier: cohort.tier,
    examIds: cohort.examIds,
  };
}

/**
 * Heal Z-score/rank for the given exam ids (used when reading dashboards).
 */
export async function healExamAnalytics(examIds = []) {
  const uniqueIds = [...new Set(examIds.filter(Boolean).map(String))];
  const healedCohorts = new Set();

  for (const examId of uniqueIds) {
    const cohort = await resolveExamCohort(examId);
    const cohortKey = `${cohort.tier}:${cohort.examIds
      .map((id) => String(id))
      .sort()
      .join("|")}`;
    if (healedCohorts.has(cohortKey)) continue;
    healedCohorts.add(cohortKey);
    await recalculateExamAnalytics(examId);
  }
}
