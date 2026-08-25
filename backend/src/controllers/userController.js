import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Subject from "../models/Subject.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  normalizeAssignmentReference,
  resolveOrCreateClass,
  resolveSubject,
} from "../utils/resolveReference.js";
import { validateOptionalPasswordChange } from "../utils/registrationValidation.js";
import {
  getAdminManagementError,
  isElevatedTargetRole,
  isSuperAdmin,
} from "../utils/adminRoles.js";
import {
  buildTeachersWithAssignments,
  syncTeacherClassSubjectAssignment,
} from "../utils/teacherAssignments.js";

async function assertCanManageUserAccount(actor, target) {
  const managementError = getAdminManagementError(actor, target);
  if (managementError) {
    return { ok: false, status: 403, message: managementError };
  }

  return { ok: true };
}

async function assertNotLastSuperAdmin(target, nextRole, nextActive) {
  if (target.role !== "superadmin") return null;

  const demoting = nextRole !== undefined && nextRole !== "superadmin";
  const disabling =
    nextActive !== undefined && nextActive === false && target.isActive;

  if (!demoting && !disabling) return null;

  const activeSuperAdmins = await User.countDocuments({
    role: "superadmin",
    isActive: true,
  });

  if (activeSuperAdmins <= 1) {
    return "Cannot demote or disable the last Super Admin account";
  }

  return null;
}

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getTeachersWithAssignments = async (req, res) => {
  try {
    // Class.assignedTeacher is singular — commerce co-teachers share a class.
    // Also show classes linked on Subject.classes for that teacher's subject
    // (set when Admin assigns class at create/edit). Do not infer from students.
    const teachersWithAssignments = await buildTeachersWithAssignments();
    res.status(200).json(teachersWithAssignments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get user by id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const access = await assertCanManageUserAccount(req.user, target);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const allowedUpdates = [
      "fullName",
      "email",
      "phoneNumber",
      "role",
      "isActive",
      "teacherId",
      "parentId",
      "relationship",
    ];

    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body.status) {
      updates.isActive = req.body.status === "Active";
    }

    if (updates.role !== undefined) {
      if (updates.role === "superadmin" && !isSuperAdmin(req.user)) {
        return res.status(403).json({
          message: "Only a Super Admin can assign the Super Admin role",
        });
      }

      if (isElevatedTargetRole(updates.role) && !isSuperAdmin(req.user)) {
        return res.status(403).json({
          message: "Only a Super Admin can assign administrator roles",
        });
      }
    }

    const lastSuperError = await assertNotLastSuperAdmin(
      target,
      updates.role,
      updates.isActive
    );
    if (lastSuperError) {
      return res.status(400).json({ message: lastSuperError });
    }

    const passwordError = validateOptionalPasswordChange({
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
    });

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    if (req.body.password) {
      updates.password = await bcrypt.hash(req.body.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "teacher") {
      const subjectRef =
        req.body.assignedSubject !== undefined
          ? normalizeAssignmentReference(req.body.assignedSubject)
          : null;
      const classRef =
        req.body.assignedClass !== undefined
          ? normalizeAssignmentReference(req.body.assignedClass)
          : null;

      let subjectId = null;
      let classId = null;

      if (subjectRef) {
        const subject = await resolveSubject(subjectRef);
        if (subject) {
          subjectId = subject._id;
        }
      } else {
        // Keep existing user link when form leaves subject blank / N/A.
        const current = await User.findById(user._id).select("assignedSubject");
        subjectId = current?.assignedSubject || null;
        if (!subjectId) {
          const legacy = await Subject.findOne({
            assignedTeacher: user._id,
          }).select("_id");
          subjectId = legacy?._id || null;
        }
      }

      if (classRef) {
        const classRecord = await resolveOrCreateClass(classRef);
        if (classRecord) {
          classId = classRecord._id;
        }
      } else {
        const current = await User.findById(user._id).select("assignedClass");
        classId = current?.assignedClass || null;
      }

      // Persist admin picks on the user + non-stealing Subject/Class links.
      if (subjectRef || classRef) {
        await syncTeacherClassSubjectAssignment({
          teacherId: user._id,
          classId,
          subjectId,
        });
      }
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "User Management",
      description: req.body.password
        ? `Updated user and password: ${user.fullName}`
        : `Updated user: ${user.fullName}`,
    });

    res.status(200).json({
      message: req.body.password
        ? "User and password updated successfully"
        : "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const disableUser = async (req, res) => {
  try {
    if (req.params.id === req.user?._id?.toString()) {
      return res.status(400).json({
        message: "You cannot disable your own account",
      });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const access = await assertCanManageUserAccount(req.user, target);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const lastSuperError = await assertNotLastSuperAdmin(
      target,
      undefined,
      false
    );
    if (lastSuperError) {
      return res.status(400).json({ message: lastSuperError });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password");

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "User Management",
      description: `Disabled user: ${user.fullName}`,
    });

    res.status(200).json({
      message: "User disabled successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const access = await assertCanManageUserAccount(req.user, user);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    if (user.role === "superadmin") {
      const activeSuperAdmins = await User.countDocuments({
        role: "superadmin",
        isActive: true,
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last Super Admin account",
        });
      }
    }

    const deletedUserName = user.fullName;
    const deletedUserRole = user.role;

    await user.deleteOne();

    await createAuditLog({
      userId: req.user?._id,
      action: "DELETE",
      module: "User Management",
      description: `Deleted user: ${deletedUserName} (${deletedUserRole})`,
    });

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
