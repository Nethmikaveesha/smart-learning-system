import SystemSettings from "../models/SystemSettings.js";

export const DEFAULT_PASS_MARK = 40;

/** @deprecated Use DEFAULT_PASS_MARK or getPassMark() */
export const PASS_MARK = DEFAULT_PASS_MARK;

let cachedPassMark = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

/**
 * Read the configured school pass mark from System Settings (cached briefly).
 */
export async function getPassMark() {
  const now = Date.now();
  if (cachedPassMark !== null && now - cacheAt < CACHE_MS) {
    return cachedPassMark;
  }

  try {
    const settings = await SystemSettings.findOne().select("passMark").lean();
    const value = Number(settings?.passMark);
    cachedPassMark =
      Number.isFinite(value) && value >= 0 && value <= 100
        ? value
        : DEFAULT_PASS_MARK;
  } catch {
    cachedPassMark = DEFAULT_PASS_MARK;
  }

  cacheAt = now;
  return cachedPassMark;
}

export function clearPassMarkCache() {
  cachedPassMark = null;
  cacheAt = 0;
}

export const calculateGrade = (marks, passMark = DEFAULT_PASS_MARK) => {
  const score = Number(marks);
  const pass = Number(passMark);

  if (score >= 75) return "A";
  if (score >= 65) return "B";
  if (score >= 55) return "C";
  if (score >= pass) return "S";
  return "F";
};

export const isPassingMark = (marks, passMark = DEFAULT_PASS_MARK) =>
  Number(marks) >= Number(passMark);

export const formatMarks = (marks) => Number(marks || 0).toFixed(2);

export const formatRank = (rank) => {
  const numericRank = Number(rank);
  return numericRank > 0 ? numericRank : "N/A";
};
