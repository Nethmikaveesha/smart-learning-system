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
      stream: req.body.stream || "Commerce",
      medium: req.body.medium || "English",
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

export const updateClass = async (req, res) => {
  try {
    const existing = await Class.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Class not found" });
    }

    const {
      className,
      academicYear,
      assignedTeacher,
      gradeLevel,
      stream,
      medium,
    } = req.body;

    const nextClassName =
      className !== undefined ? String(className).trim() : existing.className;

    const resolvedGradeLevel =
      gradeLevel !== undefined || className !== undefined
        ? normalizeGradeLevel(gradeLevel ?? existing.gradeLevel, nextClassName)
        : existing.gradeLevel;

    if (![12, 13].includes(resolvedGradeLevel)) {
      return res.status(400).json({
        message: "gradeLevel is required and must be 12 or 13",
      });
    }

    existing.className = nextClassName;
    if (academicYear !== undefined) {
      existing.academicYear = String(academicYear).trim();
    }
    existing.gradeLevel = resolvedGradeLevel;
    if (stream !== undefined) existing.stream = stream || "Commerce";
    if (medium !== undefined) existing.medium = medium || "English";
    if (assignedTeacher !== undefined) {
      existing.assignedTeacher = assignedTeacher || undefined;
    }

    await existing.save();

    const populated = await Class.findById(existing._id)
      .populate("assignedTeacher", "fullName email role")
      .populate("students", "fullName email role");

    res.status(200).json({
      message: "Class updated successfully",
      class: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllClasses = async (req, res) => {
  try {
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

    // Teachers only see classes assigned to them; admins see all.
    if (req.user?.role === "teacher") {
      filter.assignedTeacher = req.user._id;
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
