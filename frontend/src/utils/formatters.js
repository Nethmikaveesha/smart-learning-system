export const formatMarks = (marks) => {
  const numeric = Number(marks);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toFixed(2);
};

export const formatRank = (rank) => {
  const numericRank = Number(rank);
  return numericRank > 0 ? numericRank : "N/A";
};
