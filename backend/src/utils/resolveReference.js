import mongoose from "mongoose";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import Subject from "../models/Subject.js";
import { inferGradeLevel } from "./gradeLevel.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EMPTY_ASSIGNMENT_VALUES = new Set([
  "",
  "n/a",
  "na",
  "-",
  "none",
  "null",
  "undefined",
  "select class",
  "select subject",
  "not assigned",
]);

/**
 * Treat UI placeholders like "N/A" as empty so email-only edits
 * do not try to create invalid classes/subjects.
 */
export function normalizeAssignmentReference(value) {
  if (value == null) return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  if (EMPTY_ASSIGNMENT_VALUES.has(trimmed.toLowerCase())) {
    return "";
  }

  // Teachers may have multiple labels joined for display ("A, B").
  if (trimmed.includes(",")) {
    return normalizeAssignmentReference(trimmed.split(",")[0]);
  }

  return trimmed;
}

export const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === String(value);

export const resolveSubject = async (reference) => {
  const normalizedRef = normalizeAssignmentReference(reference);
  if (!normalizedRef) return null;

  if (isValidObjectId(normalizedRef)) {
    return Subject.findById(normalizedRef);
  }

  return Subject.findOne({
    $or: [
      { subjectCode: { $regex: `^${escapeRegex(normalizedRef)}$`, $options: "i" } },
      { subjectName: { $regex: `^${escapeRegex(normalizedRef)}$`, $options: "i" } },
    ],
  });
};

export const resolveClass = async (reference, academicYear = "") => {
  const normalized = normalizeAssignmentReference(reference);
  if (!normalized) return null;

  if (isValidObjectId(normalized)) {
    return Class.findById(normalized);
  }

  const year = String(academicYear || "").trim();

  if (year) {
    const withYear = await Class.findOne({
      className: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
      academicYear: year,
    });
    if (withYear) return withYear;
  }

  return Class.findOne({
    className: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
  });
};

export const resolveOrCreateClass = async (className, academicYear = "") => {
  const normalizedName = normalizeAssignmentReference(className);
  if (!normalizedName) return null;

  const existingClass = await resolveClass(normalizedName, academicYear);
  if (existingClass) {
    if (!existingClass.gradeLevel) {
      const inferred = inferGradeLevel(existingClass.className || normalizedName);
      if (inferred) {
        existingClass.gradeLevel = inferred;
        await existingClass.save();
      }
    }
    return existingClass;
  }

  const inferredGrade = inferGradeLevel(normalizedName);
  if (![12, 13].includes(inferredGrade)) {
    throw new Error(
      `Cannot create class "${normalizedName}" without grade 12 or 13 in the name (or set gradeLevel explicitly)`
    );
  }

  return Class.create({
    className: normalizedName,
    academicYear: academicYear || new Date().getFullYear().toString(),
    gradeLevel: inferredGrade,
  });
};

export const resolveStudentProfile = async (reference) => {
  if (!reference) return null;

  if (isValidObjectId(reference)) {
    return StudentProfile.findById(reference);
  }

  const normalized = String(reference).trim();

  return StudentProfile.findOne({
    studentId: { $regex: `^${normalized}$`, $options: "i" },
  });
};
