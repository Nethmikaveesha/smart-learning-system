import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";

/**
 * Generate the next unique role code (e.g. STU0001, T0001, P0001).
 * Scans existing values with the same prefix and increments the max number.
 * Falls back to a time-based suffix if a rare collision keeps happening.
 */
async function nextSequentialCode(prefix, existingValues, pad = 4) {
  let max = 0;
  const pattern = new RegExp(`^${prefix}(\\d+)$`, "i");

  for (const value of existingValues) {
    const match = String(value || "").trim().match(pattern);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }

  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
}

export async function generateUniqueStudentId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await StudentProfile.find({
      studentId: { $regex: /^STU\d+$/i },
    }).select("studentId");

    const candidate = await nextSequentialCode(
      "STU",
      existing.map((row) => row.studentId)
    );

    const taken = await StudentProfile.exists({ studentId: candidate });
    if (!taken) return candidate;
  }

  return `STU${Date.now().toString().slice(-8)}`;
}

export async function generateUniqueTeacherId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await User.find({
      role: "teacher",
      teacherId: { $regex: /^T\d+$/i },
    }).select("teacherId");

    const candidate = await nextSequentialCode(
      "T",
      existing.map((row) => row.teacherId)
    );

    const taken = await User.exists({ teacherId: candidate });
    if (!taken) return candidate;
  }

  return `T${Date.now().toString().slice(-6)}`;
}

export async function generateUniqueParentId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await User.find({
      role: "parent",
      parentId: { $regex: /^P\d+$/i },
    }).select("parentId");

    const candidate = await nextSequentialCode(
      "P",
      existing.map((row) => row.parentId)
    );

    const taken = await User.exists({ parentId: candidate });
    if (!taken) return candidate;
  }

  return `P${Date.now().toString().slice(-6)}`;
}

/**
 * Resolve IDs for registration.
 * Uses client-provided values when present and unique; otherwise auto-generates.
 */
export async function resolveRegistrationIds({
  role,
  studentId,
  teacherId,
  parentId,
}) {
  const resolved = {
    studentId: studentId?.trim() || "",
    teacherId: teacherId?.trim() || "",
    parentId: parentId?.trim() || "",
  };

  if (role === "student") {
    if (resolved.studentId) {
      const taken = await StudentProfile.exists({
        studentId: resolved.studentId,
      });
      if (taken) {
        const error = new Error(
          `Student ID ${resolved.studentId} is already in use`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      resolved.studentId = await generateUniqueStudentId();
    }
  }

  if (role === "teacher") {
    if (resolved.teacherId) {
      const taken = await User.exists({ teacherId: resolved.teacherId });
      if (taken) {
        const error = new Error(
          `Teacher ID ${resolved.teacherId} is already in use`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      resolved.teacherId = await generateUniqueTeacherId();
    }
  }

  if (role === "parent") {
    if (resolved.parentId) {
      const taken = await User.exists({ parentId: resolved.parentId });
      if (taken) {
        const error = new Error(
          `Parent ID ${resolved.parentId} is already in use`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      resolved.parentId = await generateUniqueParentId();
    }
  }

  return resolved;
}
