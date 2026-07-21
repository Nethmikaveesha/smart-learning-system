import Class from "../models/Class.js";
import {
  inferGradeLevel,
  normalizeGradeLevel,
} from "../utils/gradeLevel.js";

export const createClass = async (req, res) => {
  try {
    const { className, academicYear, assignedTeacher, gradeLevel } = req.body;

    const resolvedGradeLevel = normalizeGradeLevel(gradeLevel, className);

    if (![12, 13].includes(resolvedGradeLevel)) {
      return res.status(400).json({
        message: "gradeLevel is required and must be 12 or 13",
      });
    }

    if (!className || !academicYear) {
      return res.status(400).json({
        message: "className and academicYear are required",
      });
    }

    const newClass = await Class.create({
      className: String(className).trim(),
      academicYear: String(academicYear).trim(),
      gradeLevel: resolvedGradeLevel,
      assignedTeacher: assignedTeacher || undefined,
    });

    res.status(201).json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllClasses = async (req, res) => {
  try {
    // Heal older class records that were created before gradeLevel existed.
    const classesWithoutGrade = await Class.find({
      $or: [{ gradeLevel: { $exists: false } }, { gradeLevel: null }],
    });

    for (const classRecord of classesWithoutGrade) {
      const inferred = inferGradeLevel(classRecord.className);
      if (inferred) {
        classRecord.gradeLevel = inferred;
        await classRecord.save();
      }
    }

    const filter = {};
    if (req.query.gradeLevel) {
      const grade = Number(req.query.gradeLevel);
      if (grade === 12 || grade === 13) {
        filter.gradeLevel = grade;
      }
    }

    const classes = await Class.find(filter)
      .populate("assignedTeacher", "fullName email role")
      .populate("students", "fullName email role")
      .sort({ gradeLevel: 1, className: 1 });

    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
