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
  const contentScore =
    keywordCoverage.score * 0.6 + semanticSimilarity * 0.4;
  const marks = Math.round(contentScore * maxMarks);

  return {
    marks: Math.min(maxMarks, Math.max(0, marks)),
    semanticSimilarity: Number(semanticSimilarity.toFixed(2)),
    keywordCoverage: Number(keywordCoverage.score.toFixed(2)),
    matchedKeywords: keywordCoverage.matchedKeywords,
    missingKeywords: keywordCoverage.missingKeywords,
    feedback:
      contentScore >= 0.75
        ? "Strong answer with good keyword coverage and relevance."
        : contentScore >= 0.45
        ? "Good attempt, but add more relevant concepts from the marking scheme."
        : "Weak answer. Include more key points and explain them clearly.",
  };
};
