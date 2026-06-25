import StudentProfile from "../models/StudentProfile.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const createStudentProfile = async (req, res) => {
  try {
    const { user, studentId, classId, parent, subjects } = req.body;

    const existingProfile = await StudentProfile.findOne({
      $or: [{ studentId }, { user }],
    });

    if (existingProfile) {
      return res.status(400).json({
        message:
          "Student profile already exists for this user or student ID",
      });
    }

    const profile = await StudentProfile.create({
      user,
      studentId,
      class: classId,
      parent,
      subjects,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Student Profile",
      description: `Student profile created: ${studentId}`,
    });

    res.status(201).json({
      message: "Student Profile Created Successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllStudentProfiles = async (req, res) => {
  try {
    const profiles = await StudentProfile.find()
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName")
      .populate("parent", "fullName email");

    res.status(200).json(profiles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateStudentProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName")
      .populate("parent", "fullName email");

    if (!profile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    res.status(200).json({
      message: "Student Profile Updated Successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};