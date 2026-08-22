import Subject from "../models/Subject.js";
import { getCommerceSubjectCatalog } from "../utils/commerceSubjects.js";

export const getSubjectCatalog = async (_req, res) => {
  try {
    res.status(200).json(getCommerceSubjectCatalog());
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode, assignedTeacher } = req.body;

    if (!subjectName?.trim() || !subjectCode?.trim()) {
      return res.status(400).json({
        message: "subjectName and subjectCode are required",
      });
    }

    const subject = await Subject.create({
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim(),
      assignedTeacher: assignedTeacher || undefined,
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const existing = await Subject.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const { subjectName, subjectCode, assignedTeacher, isActive } = req.body;

    if (subjectName !== undefined) {
      if (!String(subjectName).trim()) {
        return res.status(400).json({ message: "subjectName cannot be empty" });
      }
      existing.subjectName = String(subjectName).trim();
    }

    if (subjectCode !== undefined) {
      if (!String(subjectCode).trim()) {
        return res.status(400).json({ message: "subjectCode cannot be empty" });
      }
      existing.subjectCode = String(subjectCode).trim();
    }

    if (assignedTeacher !== undefined) {
      // Empty string / null = unassign ("Not assigned" in UI). Use null so
      // Mongoose clears the ObjectId instead of leaving the previous value.
      existing.assignedTeacher = assignedTeacher || null;
    }

    if (isActive !== undefined) {
      existing.isActive = Boolean(isActive);
    }

    await existing.save();

    const populated = await Subject.findById(existing._id)
      .populate("assignedTeacher", "fullName email teacherId")
      .populate("classes", "className");

    res.status(200).json({
      message: "Subject updated successfully",
      subject: populated,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllSubjects = async (req, res) => {
  try {
    const filter = {};

    // Teachers only see subjects assigned to them; admins see all.
    if (req.user?.role === "teacher") {
      filter.assignedTeacher = req.user._id;
    }

    const subjects = await Subject.find(filter)
      .populate("assignedTeacher", "fullName email teacherId")
      .populate("classes", "className");

    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
