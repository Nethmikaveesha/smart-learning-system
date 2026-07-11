export const formatMarks = (marks) => Number(marks || 0).toFixed(2);

export const formatRank = (rank) => {
  const numericRank = Number(rank);
  return numericRank > 0 ? numericRank : "N/A";
};
