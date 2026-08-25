import Class from "../models/Class.js";
import StudentProfile from "../models/StudentProfile.js";
import User from "../models/User.js";
import {
  inferGradeLevel,
  normalizeGradeLevel,
} from "../utils/gradeLevel.js";
import { getCommerceClassCatalog } from "../utils/commerceClasses.js";
import { getTeacherScope } from "../utils/teacherScope.js";

function isTruthyQuery(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * Keep only real students on Class.students for API responses:
 * - role must be "student"
 * - must have a StudentProfile (source of Student ID)
 * - never include the class assignedTeacher
 *
 * Also soft-cleans teacher/parent/admin ids that were wrongly $addToSet'd.
 */
async function attachStudentIdsToClasses(classes = []) {
  const userIds = [];
  for (const classItem of classes) {
    for (const student of classItem.students || []) {
      const id = student?._id || student;
      if (id) userIds.push(id);
    }
  }

  const uniqueUserIds = [...new Set(userIds.map((id) => String(id)))];

  const profiles =
    uniqueUserIds.length > 0
      ? await StudentProfile.find({
          user: { $in: uniqueUserIds },
        }).select("user studentId")
      : [];

  const studentIdByUser = new Map(
    profiles.map((profile) => [
      String(profile.user),
      profile.studentId || "",
    ])
  );

  const cleanupJobs = [];

  const result = classes.map((classItem) => {
    const plain =
      typeof classItem.toObject === "function"
        ? classItem.toObject()
        : { ...classItem };

    const assignedTeacherId = String(
      plain.assignedTeacher?._id || plain.assignedTeacher || ""
    );

    const validStudents = [];
    const invalidIds = [];

    for (const student of plain.students || []) {
      if (!student || typeof student !== "object") {
        if (student) invalidIds.push(student);
        continue;
      }

      const isAssignedTeacher =
        assignedTeacherId && userKey === assignedTeacherId;
      const role = String(student.role || "").toLowerCase();
      const isNonStudentRole = ["teacher", "admin", "superadmin", "parent"].includes(
        role
      );
      const profileStudentId = studentIdByUser.get(userKey) || "";

      // Keep enrolled students; drop teachers/staff even if a stale profile exists.
      if (isAssignedTeacher || isNonStudentRole) {
        if (userKey) invalidIds.push(student._id);
        continue;
      }

      // Prefer confirmed students (role student, or legacy rows with a profile).
      if (role && role !== "student" && !profileStudentId) {
        if (userKey) invalidIds.push(student._id);
        continue;
      }

      validStudents.push({
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role || "student",
        studentId: profileStudentId,
      });
    }

    plain.students = validStudents;

    if (invalidIds.length > 0 && plain._id) {
      cleanupJobs.push(
        Class.updateOne(
          { _id: plain._id },
          { $pull: { students: { $in: invalidIds } } }
        ).catch((cleanupError) => {
          console.warn(
            "Class.students cleanup skipped:",
            cleanupError.message
          );
        })
      );
    }

    return plain;
  });

  if (cleanupJobs.length > 0) {
    await Promise.all(cleanupJobs);
  }

  return result;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getClassCatalog = async (_req, res) => {
  try {
    res.status(200).json(getCommerceClassCatalog());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

    const normalizedName = String(className).trim();
    const normalizedYear = String(academicYear).trim();

    const duplicate = await Class.findOne({
      className: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
      academicYear: normalizedYear,
      stream: req.body.stream || "Commerce",
    });

    if (duplicate) {
      return res.status(400).json({
        message: `Class "${normalizedName}" already exists for academic year ${normalizedYear}`,
      });
    }

    const newClass = await Class.create({
      className: normalizedName,
      academicYear: normalizedYear,
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
      // Empty string / null = unassign ("Not assigned" in UI). Use null so
      // Mongoose clears the ObjectId instead of leaving the previous value.
      existing.assignedTeacher = assignedTeacher || null;
    }

    const duplicate = await Class.findOne({
      _id: { $ne: existing._id },
      className: {
        $regex: `^${escapeRegex(existing.className)}$`,
        $options: "i",
      },
      academicYear: existing.academicYear,
      stream: existing.stream || "Commerce",
    });

    if (duplicate) {
      return res.status(400).json({
        message: `Class "${existing.className}" already exists for academic year ${existing.academicYear}`,
      });
    }

    await existing.save();

    const populated = await Class.findById(existing._id)
      .populate("assignedTeacher", "fullName email role teacherId")
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

    // Teachers: My Classes uses assignedOnly (admin assignment only).
    // Other callers keep expanded teaching scope (twins / subject links).
    if (req.user?.role === "teacher") {
      if (isTruthyQuery(req.query.assignedOnly)) {
        const teacher = await User.findById(req.user._id).select(
          "assignedClass"
        );
        if (teacher?.assignedClass) {
          filter._id = teacher.assignedClass;
        } else {
          filter.assignedTeacher = req.user._id;
        }
      } else {
        const scope = await getTeacherScope(req.user._id);
        if (!scope.classIds.length) {
          return res.status(200).json([]);
        }
        filter._id = { $in: scope.classIds };
      }
    }

    const classes = await Class.find(filter)
      .populate("assignedTeacher", "fullName email role teacherId")
      .populate("students", "fullName email role")
      .sort({ gradeLevel: 1, className: 1 });

    const classesWithStudentIds = await attachStudentIdsToClasses(classes);
    res.status(200).json(classesWithStudentIds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
