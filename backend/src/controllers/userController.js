import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
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

function uniqueClassLabels(classDocs = []) {
  const seen = new Set();
  const labels = [];

  for (const classRecord of classDocs) {
    const name = String(classRecord?.className || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(name);
  }

  return labels;
}

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
    const teachers = await User.find({ role: "teacher" }).select("-password");
    const subjects = await Subject.find().select(
      "subjectCode subjectName assignedTeacher classes"
    );
    const classes = await Class.find().select(
      "className assignedTeacher academicYear gradeLevel"
    );
    const classById = new Map(
      classes.map((classRecord) => [String(classRecord._id), classRecord])
    );

    // Students taking each subject — used when Class.assignedTeacher is empty
    // but the teacher already teaches that subject in those classes.
    const taughtSubjectIds = subjects
      .filter((subject) => subject.assignedTeacher)
      .map((subject) => subject._id);

    const studentClassLinks =
      taughtSubjectIds.length > 0
        ? await StudentProfile.find({
            subjects: { $in: taughtSubjectIds },
            class: { $ne: null },
          }).select("class subjects")
        : [];

    const teachersWithAssignments = teachers.map((teacher) => {
      const teacherId = String(teacher._id);
      const assignedSubjects = subjects.filter(
        (subject) => String(subject.assignedTeacher || "") === teacherId
      );
      const assignedSubjectIdSet = new Set(
        assignedSubjects.map((subject) => String(subject._id))
      );

      const resolvedClasses = [];

      // 1) Explicit class-teacher assignment
      for (const classRecord of classes) {
        if (String(classRecord.assignedTeacher || "") === teacherId) {
          resolvedClasses.push(classRecord);
        }
      }

      // 2) Classes linked on the teacher's assigned subject(s)
      for (const subject of assignedSubjects) {
        for (const classId of subject.classes || []) {
          const classRecord = classById.get(String(classId));
          if (classRecord) resolvedClasses.push(classRecord);
        }
      }

      // 3) Classes of students who take the teacher's subject(s)
      for (const profile of studentClassLinks) {
        const takesSubject = (profile.subjects || []).some((subjectId) =>
          assignedSubjectIdSet.has(String(subjectId))
        );
        if (!takesSubject) continue;
        const classRecord = classById.get(String(profile.class));
        if (classRecord) resolvedClasses.push(classRecord);
      }

      const classLabels = uniqueClassLabels(resolvedClasses);

      return {
        ...teacher.toObject(),
        assignedSubjectCode:
          assignedSubjects
            .map((subject) => subject.subjectCode || subject.subjectName)
            .filter(Boolean)
            .join(", ") || "N/A",
        assignedClassName: classLabels.join(", ") || "N/A",
      };
    });

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
      if (req.body.assignedSubject !== undefined) {
        const subjectRef = normalizeAssignmentReference(
          req.body.assignedSubject
        );

        // Empty / "N/A" = leave current subject assignment unchanged
        // (so email-only edits do not wipe teaching scope).
        if (subjectRef) {
          await Subject.updateMany(
            { assignedTeacher: user._id },
            { $unset: { assignedTeacher: "" } }
          );

          const subject = await resolveSubject(subjectRef);
          if (subject) {
            await Subject.findByIdAndUpdate(subject._id, {
              assignedTeacher: user._id,
            });
          }
        }
      }

      if (req.body.assignedClass !== undefined) {
        const classRef = normalizeAssignmentReference(req.body.assignedClass);

        // Empty / "N/A" = leave current class assignment unchanged.
        if (classRef) {
          await Class.updateMany(
            { assignedTeacher: user._id },
            { $unset: { assignedTeacher: "" } }
          );

          const classRecord = await resolveOrCreateClass(classRef);
          if (classRecord) {
            await Class.findByIdAndUpdate(classRecord._id, {
              assignedTeacher: user._id,
            });
          }
        }
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
