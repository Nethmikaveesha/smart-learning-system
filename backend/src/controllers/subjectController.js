import Subject from "../models/Subject.js";
import User from "../models/User.js";
import {
  ensureCommerceSubjectIds,
  getCommerceSubjectCatalog,
} from "../utils/commerceSubjects.js";

const FIXED_COMMERCE_CODES = new Set(["ACC101", "BS101", "ECO101"]);

function isFixedCommerceSubject(subject) {
  return FIXED_COMMERCE_CODES.has(
    String(subject?.subjectCode || "").toUpperCase()
  );
}

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

    const code = subjectCode.trim().toUpperCase();
    const existing = await Subject.findOne({
      subjectCode: { $regex: `^${code}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({
        message: `Subject ${existing.subjectCode} already exists. Use Assign / Edit on the Subjects page instead of creating a duplicate.`,
      });
    }

    const subject = await Subject.create({
      subjectName: subjectName.trim(),
      subjectCode: code,
      assignedTeacher: assignedTeacher || undefined,
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "That subject code already exists. Commerce subjects are fixed — assign a teacher instead of creating a new record.",
      });
    }

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
    const fixed = isFixedCommerceSubject(existing);

    if (fixed) {
      const renamingName =
        subjectName !== undefined &&
        String(subjectName).trim() !== existing.subjectName;
      const renamingCode =
        subjectCode !== undefined &&
        String(subjectCode).trim().toUpperCase() !==
          String(existing.subjectCode || "").toUpperCase();

      if (renamingName || renamingCode) {
        return res.status(400).json({
          message:
            "Commerce subject name and code are fixed. Only assigned teacher and status can be changed.",
        });
      }
    } else {
      if (subjectName !== undefined) {
        if (!String(subjectName).trim()) {
          return res
            .status(400)
            .json({ message: "subjectName cannot be empty" });
        }
        existing.subjectName = String(subjectName).trim();
      }

      if (subjectCode !== undefined) {
        if (!String(subjectCode).trim()) {
          return res
            .status(400)
            .json({ message: "subjectCode cannot be empty" });
        }
        existing.subjectCode = String(subjectCode).trim();
      }
    }

    if (assignedTeacher !== undefined) {
      // Empty string / null = unassign ("Not assigned" in UI). Use null so
      // Mongoose clears the ObjectId instead of leaving the previous value.
      const nextTeacher = assignedTeacher || null;
      const previousTeacher = existing.assignedTeacher
        ? String(existing.assignedTeacher)
        : null;

      existing.assignedTeacher = nextTeacher;

      // Keep User.assignedSubject in sync for Add Teacher list display.
      if (previousTeacher && previousTeacher !== String(nextTeacher || "")) {
        await User.updateOne(
          { _id: previousTeacher, assignedSubject: existing._id },
          { $unset: { assignedSubject: 1 } }
        );
      }

      if (nextTeacher) {
        await User.findByIdAndUpdate(nextTeacher, {
          assignedSubject: existing._id,
        });
      }
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
    } else if (
      req.user?.role === "admin" ||
      req.user?.role === "superadmin"
    ) {
      // Ensure the three fixed commerce subjects exist for the Subjects board.
      await ensureCommerceSubjectIds();
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
