import Subject from "../models/Subject.js";

/**
 * Papers the teacher owns (created) plus legacy papers with no creator
 * on subjects assigned to them — so old data is not hidden.
 */
export async function getOwnedPapersFilter(teacherId) {
  const mySubjectIds = await Subject.find({
    assignedTeacher: teacherId,
  }).distinct("_id");

  return {
    $or: [
      { createdBy: teacherId },
      {
        subject: { $in: mySubjectIds },
        $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
      },
    ],
  };
}

/** Papers another teacher explicitly shared with this teacher. */
export function getSharedPapersFilter(teacherId) {
  return {
    sharedWith: teacherId,
    createdBy: { $ne: teacherId },
  };
}

/**
 * Department-wide papers for subjects this teacher teaches.
 * Intended for admin/superadmin department browsing only.
 */
export async function getDepartmentPapersFilter(teacherId) {
  const mySubjectIds = await Subject.find({
    assignedTeacher: teacherId,
  }).distinct("_id");

  if (!mySubjectIds.length) {
    return { _id: { $in: [] } };
  }

  return { subject: { $in: mySubjectIds } };
}

/** Default teacher list access used by submissions / marking schemes. */
export async function getTeacherPaperFilter(teacherId) {
  return getOwnedPapersFilter(teacherId);
}

export function isAdminRole(role) {
  return role === "admin" || role === "superadmin";
}

export function isPaperCreator(paper, userId) {
  if (!paper?.createdBy) return false;
  const creatorId = paper.createdBy?._id || paper.createdBy;
  return String(creatorId) === String(userId);
}

export function canManagePaper(paper, user) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  return isPaperCreator(paper, user._id);
}

export function isPaperSharedWith(paper, userId) {
  const shared = paper?.sharedWith || [];
  return shared.some((id) => String(id?._id || id) === String(userId));
}
