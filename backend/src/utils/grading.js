export const PASS_MARK = 40;

export const calculateGrade = (marks) => {
  if (marks >= 75) return "A";
  if (marks >= 65) return "B";
  if (marks >= 55) return "C";
  if (marks >= PASS_MARK) return "S";
  return "F";
};

export const isPassingMark = (marks) => Number(marks) >= PASS_MARK;

export const formatMarks = (marks) => Number(marks || 0).toFixed(2);

export const formatRank = (rank) => {
  const numericRank = Number(rank);
  return numericRank > 0 ? numericRank : "N/A";
};
