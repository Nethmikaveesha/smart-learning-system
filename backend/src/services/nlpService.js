const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

const normalize = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stem = (word) =>
  word
    .replace(/(ing|edly|ed|ly|es|s)$/i, "")
    .replace(/(tion)$/i, "t");

const tokenize = (text = "") =>
  normalize(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map(stem);

const getTermFrequency = (tokens) =>
  tokens.reduce((frequency, token) => {
    frequency[token] = (frequency[token] || 0) + 1;
    return frequency;
  }, {});

const calculateCosineSimilarity = (firstTokens, secondTokens) => {
  const firstFrequency = getTermFrequency(firstTokens);
  const secondFrequency = getTermFrequency(secondTokens);
  const allTerms = new Set([
    ...Object.keys(firstFrequency),
    ...Object.keys(secondFrequency),
  ]);

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  allTerms.forEach((term) => {
    const firstValue = firstFrequency[term] || 0;
    const secondValue = secondFrequency[term] || 0;

    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue ** 2;
    secondMagnitude += secondValue ** 2;
  });

  if (!firstMagnitude || !secondMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
};

const calculateKeywordCoverage = (answerTokens, keywords = []) => {
  if (!keywords.length) {
    return {
      score: 0,
      matchedKeywords: [],
      missingKeywords: [],
    };
  }

  const answerTokenSet = new Set(answerTokens);
  const normalizedKeywords = keywords.map((keyword) => ({
    original: keyword,
    tokens: tokenize(keyword),
  }));

  const matchedKeywords = normalizedKeywords
    .filter(({ tokens }) =>
      tokens.some((token) => answerTokenSet.has(token))
    )
    .map(({ original }) => original);

  const missingKeywords = normalizedKeywords
    .filter(({ original }) => !matchedKeywords.includes(original))
    .map(({ original }) => original);

  return {
    score: matchedKeywords.length / normalizedKeywords.length,
    matchedKeywords,
    missingKeywords,
  };
};

const splitIntoParagraphs = (text = "") =>
  text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const splitIntoSentences = (text = "") =>
  text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const countWords = (text = "") =>
  normalize(text)
    .split(" ")
    .filter(Boolean).length;

const includesAny = (text = "", phrases = []) => {
  const normalizedText = normalize(text);
  return phrases.some((phrase) => normalizedText.includes(phrase));
};

const calculateEssayStructure = (answer = "") => {
  const paragraphs = splitIntoParagraphs(answer);
  const sentences = splitIntoSentences(answer);
  const sections =
    paragraphs.length >= 3
      ? paragraphs
      : [
          sentences.slice(0, 2).join(". "),
          sentences.slice(2, -1).join(". "),
          sentences.slice(-1).join(". "),
        ].filter(Boolean);

  const firstSection = sections[0] || "";
  const middleSections = sections.slice(1, -1).join(" ");
  const lastSection =
    sections.length > 1 ? sections[sections.length - 1] : "";
  const totalWords = countWords(answer);
  const conclusionMarkers = [
    "in conclusion",
    "to conclude",
    "therefore",
    "overall",
    "finally",
    "as a result",
    "in summary",
  ];

  const introductionScore =
    countWords(firstSection) >= 20
      ? 1
      : countWords(firstSection) >= 10
      ? 0.6
      : 0;

  const bodyScore =
    countWords(middleSections) >= 45 || sentences.length >= 5
      ? 1
      : totalWords >= 60
      ? 0.7
      : totalWords >= 30
      ? 0.4
      : 0;

  const conclusionScore = includesAny(lastSection, conclusionMarkers)
    ? 1
    : countWords(lastSection) >= 15 && sections.length >= 2
    ? 0.7
    : 0;

  const score =
    introductionScore * 0.3 + bodyScore * 0.5 + conclusionScore * 0.2;

  return {
    score: Number(score.toFixed(2)),
    introduction: Number(introductionScore.toFixed(2)),
    body: Number(bodyScore.toFixed(2)),
    conclusion: Number(conclusionScore.toFixed(2)),
    feedback:
      score >= 0.75
        ? "The answer has a clear introduction, body, and conclusion."
        : score >= 0.45
        ? "The answer has a basic structure, but the introduction or conclusion can be clearer."
        : "The answer needs a clearer introduction, body, and conclusion.",
  };
};

export const evaluateEssayWithNlp = ({
  answer,
  modelAnswer,
  keywords,
  maxMarks,
}) => {
  const answerTokens = tokenize(answer);
  const modelAnswerTokens = tokenize(modelAnswer);
  const semanticSimilarity = calculateCosineSimilarity(
    answerTokens,
    modelAnswerTokens
  );
  const keywordCoverage = calculateKeywordCoverage(answerTokens, keywords);
  const structureAnalysis = calculateEssayStructure(answer);
  const contentScore =
    keywordCoverage.score * 0.45 +
    semanticSimilarity * 0.35 +
    structureAnalysis.score * 0.2;
  const marks = Math.round(contentScore * maxMarks);

  return {
    marks: Math.min(maxMarks, Math.max(0, marks)),
    semanticSimilarity: Number(semanticSimilarity.toFixed(2)),
    keywordCoverage: Number(keywordCoverage.score.toFixed(2)),
    structureScore: structureAnalysis.score,
    structureAnalysis,
    matchedKeywords: keywordCoverage.matchedKeywords,
    missingKeywords: keywordCoverage.missingKeywords,
    feedback:
      contentScore >= 0.75
        ? `Strong answer with good keyword coverage, relevance, and structure. ${structureAnalysis.feedback}`
        : contentScore >= 0.45
        ? `Good attempt, but add more relevant concepts and improve essay structure. ${structureAnalysis.feedback}`
        : `Weak answer. Include more key points and organize the answer clearly. ${structureAnalysis.feedback}`,
  };
};
