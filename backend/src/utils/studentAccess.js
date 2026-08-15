import StudentProfile from "../models/StudentProfile.js";

/**
 * Students/parents may only access their own linked profile.
 * Admins and teachers can access any student profile.
 */
export async function assertCanAccessStudentProfile(req, studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId);

  if (!profile) {
    return {
      ok: false,
      status: 404,
      message: "Student profile not found",
    };
  }

  const role = req.user?.role;
  const userId = String(req.user?._id || "");

  if (role === "admin" || role === "teacher") {
    return { ok: true, profile };
  }

  if (role === "student" && String(profile.user) === userId) {
    return { ok: true, profile };
  }

  if (role === "parent" && String(profile.parent) === userId) {
    return { ok: true, profile };
  }

  return {
    ok: false,
    status: 403,
    message: "Access denied for this student profile",
  };
}
