/**
 * Build part-wise essay marks from keyword + structure evaluation.
 * Matches the AI-Assisted Essay Grader design:
 * keywords + structure → recommended scores teachers can modify.
 */

const PART_WEIGHTS = [
  {
    key: "keywords",
    label: "Keywords & Key Concepts",
    weight: 0.4,
    description: "Coverage of expected keywords and key concepts",
  },
  {
    key: "introduction",
    label: "Introduction",
    weight: 0.15,
    description: "Clear opening that introduces the topic",
  },
  {
    key: "body",
    label: "Body / Explanation",
    weight: 0.3,
    description: "Main explanation with supporting points",
  },
  {
    key: "conclusion",
    label: "Conclusion",
    weight: 0.15,
    description: "Closing summary or concluding statement",
  },
];

const roundMarks = (value) => Math.round(Number(value) * 10) / 10;

const allocateMaxMarks = (maxMarks) => {
  const raw = PART_WEIGHTS.map((part) => ({
    ...part,
    maxMarks: roundMarks(maxMarks * part.weight),
  }));

  const allocated = raw.reduce((sum, part) => sum + part.maxMarks, 0);
  const difference = roundMarks(maxMarks - allocated);

  if (difference !== 0 && raw.length > 0) {
    raw[raw.length - 1].maxMarks = roundMarks(
      raw[raw.length - 1].maxMarks + difference
    );
  }

  return raw;
};

const scoreForPart = (key, { keywordCoverage = 0, structureAnalysis = {} }) => {
  if (key === "keywords") return Number(keywordCoverage) || 0;
  if (key === "introduction") return Number(structureAnalysis.introduction) || 0;
  if (key === "body") return Number(structureAnalysis.body) || 0;
  if (key === "conclusion") return Number(structureAnalysis.conclusion) || 0;
  return 0;
};

export const buildMarkBreakdown = ({
  maxMarks = 10,
  keywordCoverage = 0,
  structureAnalysis = {},
  matchedKeywords = [],
  missingKeywords = [],
}) => {
  const parts = allocateMaxMarks(maxMarks).map((part) => {
    const ratio = Math.min(1, Math.max(0, scoreForPart(part.key, {
      keywordCoverage,
      structureAnalysis,
    })));

    const recommendedMarks = roundMarks(part.maxMarks * ratio);

    return {
      key: part.key,
      label: part.label,
      description: part.description,
      maxMarks: part.maxMarks,
      recommendedMarks,
      teacherMarks: null,
      ratio: Number(ratio.toFixed(2)),
      details:
        part.key === "keywords"
          ? {
              matchedKeywords,
              missingKeywords,
            }
          : undefined,
    };
  });

  const recommendedTotal = roundMarks(
    parts.reduce((sum, part) => sum + part.recommendedMarks, 0)
  );

  return {
    parts,
    recommendedTotal: Math.min(maxMarks, Math.max(0, recommendedTotal)),
    teacherTotal: null,
    maxMarks,
    scoringMethod: "keywords_and_structure",
  };
};

export const applyTeacherPartMarks = (existingBreakdown = {}, teacherParts = []) => {
  const parts = (existingBreakdown.parts || []).map((part) => {
    const override = teacherParts.find((item) => item.key === part.key);
    const teacherMarks =
      override && override.teacherMarks !== undefined && override.teacherMarks !== ""
        ? roundMarks(Number(override.teacherMarks))
        : part.teacherMarks;

    const safeTeacherMarks =
      teacherMarks === null || Number.isNaN(teacherMarks)
        ? null
        : Math.min(part.maxMarks, Math.max(0, teacherMarks));

    return {
      ...part,
      teacherMarks: safeTeacherMarks,
    };
  });

  const allTeacherFilled = parts.every(
    (part) => part.teacherMarks !== null && part.teacherMarks !== undefined
  );

  const teacherTotal = allTeacherFilled
    ? roundMarks(parts.reduce((sum, part) => sum + Number(part.teacherMarks), 0))
    : null;

  return {
    ...existingBreakdown,
    parts,
    teacherTotal:
      teacherTotal === null
        ? null
        : Math.min(existingBreakdown.maxMarks || teacherTotal, Math.max(0, teacherTotal)),
  };
};
