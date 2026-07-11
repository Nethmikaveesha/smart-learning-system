import mongoose from "mongoose";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import Subject from "../models/Subject.js";

export const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === String(value);

export const resolveSubject = async (reference) => {
  if (!reference) return null;

  if (isValidObjectId(reference)) {
    return Subject.findById(reference);
  }

  const normalized = String(reference).trim();

  return Subject.findOne({
    $or: [
      { subjectCode: { $regex: `^${normalized}$`, $options: "i" } },
      { subjectName: { $regex: `^${normalized}$`, $options: "i" } },
    ],
  });
};

export const resolveClass = async (reference) => {
  if (!reference) return null;

  if (isValidObjectId(reference)) {
    return Class.findById(reference);
  }

  const normalized = String(reference).trim();

  return Class.findOne({
    $or: [
      { className: { $regex: `^${normalized}$`, $options: "i" } },
      { academicYear: normalized },
    ],
  });
};

export const resolveOrCreateClass = async (className, academicYear = "") => {
  if (!className) return null;

  const existingClass = await resolveClass(className);
  if (existingClass) return existingClass;

  return Class.create({
    className: String(className).trim(),
    academicYear: academicYear || new Date().getFullYear().toString(),
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
