import StudentProfile from "../models/StudentProfile.js";
import User from "../models/User.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { resolveClass, resolveOrCreateClass } from "../utils/resolveReference.js";

export const createStudentProfile = async (req, res) => {
  try {
    const { user, studentId, className, parent, subjects } = req.body;

    const existingProfile = await StudentProfile.findOne({
      $or: [{ studentId }, { user }],
    });

    if (existingProfile) {
      return res.status(400).json({
        message:
          "Student profile already exists for this user or student ID",
      });
    }

    const classRecord = className
      ? await resolveOrCreateClass(className)
      : null;

    const profile = await StudentProfile.create({
      user,
      studentId,
      class: classRecord?._id,
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
      .populate("user", "fullName email phoneNumber isActive role")
      .populate("class", "className academicYear")
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
    const { studentId, className, academicYear, fullName, email, phoneNumber, status } =
      req.body;

    const profile = await StudentProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const classRecord = className
      ? await resolveOrCreateClass(className, academicYear)
      : null;

    const updatedProfile = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      {
        ...(studentId !== undefined ? { studentId } : {}),
        ...(classRecord ? { class: classRecord._id } : {}),
        ...(academicYear !== undefined ? { academicYear } : {}),
      },
      { new: true }
    )
      .populate("user", "fullName email phoneNumber isActive role")
      .populate("class", "className academicYear")
      .populate("subjects", "subjectName")
      .populate("parent", "fullName email");

    if (fullName || email || phoneNumber || status) {
      await User.findByIdAndUpdate(profile.user, {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
        ...(status !== undefined ? { isActive: status === "Active" } : {}),
      });
    }

    res.status(200).json({
      message: "Student updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteStudentProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const user = await User.findById(profile.user);

    await profile.deleteOne();

    if (user) {
      await user.deleteOne();
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "DELETE",
      module: "Student Profile",
      description: `Deleted student: ${profile.studentId}`,
    });

    res.status(200).json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};