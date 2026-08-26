import { resolveTeacherSubjectIds } from "./teacherScope.js";

/**
 * Papers this teacher created. "My Papers" must stay creator-only —
 * orphan/legacy subject papers must not appear for newly assigned teachers.
 */
export async function getOwnedPapersFilter(teacherId) {
  return { createdBy: teacherId };
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
  const mySubjectIds = await resolveTeacherSubjectIds(teacherId);

  if (!mySubjectIds.length) {
    return { _id: { $in: [] } };
  }

  return { subject: { $in: mySubjectIds } };
}

/**
 * Papers a teacher may mark / attach schemes for: own creations + shared.
 * Does not include orphan subject papers.
 */
export async function getTeacherPaperFilter(teacherId) {
  return {
    $or: [
      { createdBy: teacherId },
      {
        sharedWith: teacherId,
        createdBy: { $ne: teacherId },
      },
    ],
  };
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

export { resolveTeacherSubjectIds };
