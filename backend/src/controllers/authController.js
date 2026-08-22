import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import Subject from "../models/Subject.js";
import jwt from "jsonwebtoken";
import {
  resolveClass,
  resolveOrCreateClass,
  resolveStudentProfile,
  resolveSubject,
} from "../utils/resolveReference.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { validateRegistrationInput } from "../utils/registrationValidation.js";
import { isEmailConfigured, sendEmail } from "../utils/sendEmail.js";
import { ensureCommerceSubjectIds } from "../utils/commerceSubjects.js";
import { resolveRegistrationIds } from "../utils/generateRoleIds.js";
import {
  isValidParentRelationship,
  PARENT_RELATIONSHIPS,
} from "../utils/parentLinks.js";

const RESET_TOKEN_HOURS = 1;

function getFrontendBaseUrl() {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173"
  );
}

function buildResetLink(rawToken) {
  return `${getFrontendBaseUrl()}/reset-password?token=${rawToken}`;
}

export const registerAdmin = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, confirmPassword, status } =
      req.body;

    const validationError = validateRegistrationInput({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      role: "admin",
      isActive: status ? status === "Active" : true,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "User Management",
      description: `Created admin account: ${user.fullName}`,
    });

    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registerUser = async (req, res) => {
  let createdUserId = null;
  let createdProfileId = null;
  let assignedSubjectId = null;
  let assignedClassTeacherId = null;
  let linkedParentStudentId = null;
  let previousParentId = null;

  try {
    const {
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      role,
      status,
      teacherId,
      assignedSubject,
      assignedClass,
      studentId,
      className,
      academicYear,
      parent,
      parentId,
      childStudent,
      relationship,
    } = req.body;

    if (role === "admin" || role === "superadmin") {
      return res.status(400).json({
        message: "Use the admin registration endpoint to create admin accounts",
      });
    }

    const validationError = validateRegistrationInput({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (role === "parent") {
      if (!childStudent) {
        return res.status(400).json({
          message:
            "Select a student to link before creating the parent account",
        });
      }

      if (!isValidParentRelationship(relationship)) {
        return res.status(400).json({
          message: `Relationship must be one of: ${PARENT_RELATIONSHIPS.join(", ")}`,
        });
      }
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered" });
    }

    const resolvedIds = await resolveRegistrationIds({
      role,
      studentId,
      teacherId,
      parentId,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      role,
      isActive: status ? status === "Active" : true,
      teacherId: role === "teacher" ? resolvedIds.teacherId : undefined,
      parentId: role === "parent" ? resolvedIds.parentId : undefined,
      relationship: role === "parent" ? relationship : "",
    });
    createdUserId = user._id;

    let profile = null;

    if (role === "teacher") {
      if (assignedSubject) {
        const subject = await resolveSubject(assignedSubject);

        if (!subject) {
          const err = new Error(
            `Subject not found for reference: ${assignedSubject}`
          );
          err.statusCode = 404;
          throw err;
        }

        await Subject.findByIdAndUpdate(subject._id, {
          assignedTeacher: user._id,
        });
        assignedSubjectId = subject._id;
      }

      if (assignedClass) {
        const classRecord = await resolveOrCreateClass(assignedClass);

        await Class.findByIdAndUpdate(classRecord._id, {
          assignedTeacher: user._id,
        });
        assignedClassTeacherId = classRecord._id;
      }
    }

    if (role === "student") {
      const classRecord = className
        ? await resolveOrCreateClass(className, academicYear)
        : null;

      profile = await StudentProfile.create({
        user: user._id,
        studentId: resolvedIds.studentId,
        class: classRecord?._id || undefined,
        parent: parent || undefined,
        academicYear,
        // Commerce stream students always get ACC / BS / ECO linked.
        subjects: await ensureCommerceSubjectIds(),
      });
      createdProfileId = profile._id;

      if (classRecord) {
        await Class.findByIdAndUpdate(classRecord._id, {
          $addToSet: { students: user._id },
        });
      }
    }

    if (role === "parent") {
      const studentProfile = await resolveStudentProfile(childStudent);

      if (!studentProfile) {
        const err = new Error(
          `Student profile not found for reference: ${childStudent}`
        );
        err.statusCode = 404;
        throw err;
      }

      previousParentId = studentProfile.parent || null;
      linkedParentStudentId = studentProfile._id;

      const linkUpdate = {
        $addToSet: { parents: user._id },
      };

      // Keep legacy primary parent field populated for older queries.
      if (!studentProfile.parent) {
        linkUpdate.$set = { parent: user._id };
      }

      profile = await StudentProfile.findByIdAndUpdate(
        studentProfile._id,
        linkUpdate,
        { new: true }
      );
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        teacherId: user.teacherId || undefined,
        parentId: user.parentId || undefined,
      },
      profile,
      generatedIds: {
        studentId: role === "student" ? resolvedIds.studentId : undefined,
        teacherId: role === "teacher" ? resolvedIds.teacherId : undefined,
        parentId: role === "parent" ? resolvedIds.parentId : undefined,
      },
    });
  } catch (error) {
    // Compensating cleanup — avoid orphan user/profile after mid-flow failure.
    try {
      if (createdProfileId) {
        await StudentProfile.findByIdAndDelete(createdProfileId);
      }
      if (linkedParentStudentId) {
        const revert = {
          $pull: { parents: createdUserId },
        };
        if (
          previousParentId === null ||
          String(previousParentId) !== String(createdUserId)
        ) {
          revert.$set = { parent: previousParentId || null };
        }
        await StudentProfile.findByIdAndUpdate(linkedParentStudentId, revert);
      }
      if (assignedSubjectId) {
        await Subject.findByIdAndUpdate(assignedSubjectId, {
          $unset: { assignedTeacher: 1 },
        });
      }
      if (assignedClassTeacherId && createdUserId) {
        await Class.findByIdAndUpdate(assignedClassTeacherId, {
          $unset: { assignedTeacher: 1 },
        });
      }
      if (createdUserId) {
        await Class.updateMany(
          { students: createdUserId },
          { $pull: { students: createdUserId } }
        );
        await User.findByIdAndDelete(createdUserId);
      }
    } catch (cleanupError) {
      console.error("Registration cleanup failed:", cleanupError.message);
    }

    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is inactive. Please contact your school admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/** Return the authenticated user from the DB (keeps frontend role in sync). */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.status(200).json({
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Public: start password reset.
 * Always returns a generic success message (does not reveal if email exists).
 * When SMTP is not configured, returns resetLink so local/demo setups still work.
 */
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const genericMessage =
      "If an account exists for that email, password reset instructions have been sent.";

    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(
      Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000
    );
    await user.save();

    const resetLink = buildResetLink(rawToken);
    let emailSent = false;

    if (isEmailConfigured()) {
      try {
        const result = await sendEmail({
          to: user.email,
          subject: "EduTrack password reset",
          text: `Reset your EduTrack password using this link (valid for ${RESET_TOKEN_HOURS} hour):\n\n${resetLink}\n\nIf you did not request this, you can ignore this email.`,
          html: `
            <p>Hello ${user.fullName},</p>
            <p>We received a request to reset your EduTrack password.</p>
            <p><a href="${resetLink}">Reset your password</a></p>
            <p>This link expires in ${RESET_TOKEN_HOURS} hour.</p>
            <p>If you did not request this, you can ignore this email.</p>
          `,
        });
        emailSent = result.sent;
      } catch (mailError) {
        console.error("Password reset email failed:", mailError.message);
        emailSent = false;
      }
    }

    // Demo / school setups without SMTP: expose the one-time link so the flow works.
    const response = {
      message: emailSent
        ? "Password reset instructions have been sent to your email."
        : genericMessage,
      emailSent,
    };

    if (!emailSent) {
      response.resetLink = resetLink;
      response.resetToken = rawToken;
      response.demoNote =
        "Email delivery is not configured. Use the reset link below (valid for 1 hour).";
      console.info(`[forgot-password] Reset link for ${user.email}: ${resetLink}`);
    }

    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Public: set a new password using the one-time reset token from the email/link.
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Token, new password, and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirmation do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Request a new one.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is inactive. Please contact your school admin.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await User.updateOne(
      { _id: user._id },
      { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
    );

    await createAuditLog({
      userId: user._id,
      action: "UPDATE",
      module: "Auth",
      description: "Password reset via forgot-password link",
    });

    res.status(200).json({
      message: "Password updated successfully. You can sign in with your new password.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirmation do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createAuditLog({
      userId: user._id,
      action: "UPDATE",
      module: "Auth",
      description: "Password changed successfully",
    });

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
