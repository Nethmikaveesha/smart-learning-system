import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { resolveClass, resolveOrCreateClass, resolveSubject } from "../utils/resolveReference.js";

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
      "subjectCode subjectName assignedTeacher"
    );
    const classes = await Class.find().select("className assignedTeacher");

    const teachersWithAssignments = teachers.map((teacher) => {
      const teacherId = teacher._id.toString();
      const assignedSubjects = subjects.filter(
        (subject) => subject.assignedTeacher?.toString() === teacherId
      );
      const assignedClasses = classes.filter(
        (classRecord) => classRecord.assignedTeacher?.toString() === teacherId
      );

      return {
        ...teacher.toObject(),
        assignedSubjectCode:
          assignedSubjects.map((subject) => subject.subjectCode).join(", ") ||
          "N/A",
        assignedClassName:
          assignedClasses.map((classRecord) => classRecord.className).join(", ") ||
          "N/A",
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
        await Subject.updateMany(
          { assignedTeacher: user._id },
          { $unset: { assignedTeacher: "" } }
        );

        if (req.body.assignedSubject) {
          const subject = await resolveSubject(req.body.assignedSubject);
          if (subject) {
            await Subject.findByIdAndUpdate(subject._id, {
              assignedTeacher: user._id,
            });
          }
        }
      }

      if (req.body.assignedClass !== undefined) {
        await Class.updateMany(
          { assignedTeacher: user._id },
          { $unset: { assignedTeacher: "" } }
        );

        if (req.body.assignedClass) {
          const classRecord = await resolveOrCreateClass(req.body.assignedClass);
          await Class.findByIdAndUpdate(classRecord._id, {
            assignedTeacher: user._id,
          });
        }
      }
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "User Management",
      description: `Updated user: ${user.fullName}`,
    });

    res.status(200).json({
      message: "User updated successfully",
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

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
