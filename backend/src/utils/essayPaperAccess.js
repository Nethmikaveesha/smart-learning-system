import EssayQuestion from "../models/EssayQuestion.js";
import StudentProfile from "../models/StudentProfile.js";
import {
  getTeacherScope,
  resolvePrimaryAssignedClassTwinIds,
  resolveTeacherSubjectIds,
} from "./teacherScope.js";

/**
 * Ownership matrix (teachers):
 * - My Papers              → createdBy only
 * - Shared Papers          → explicitly shared only
 * - Marking schemes list   → owned OR shared (view/copy)
 * - Create marking scheme  → owned papers only
 * - Submissions / review   → own papers OR assigned class+subject
 *                            (sharing a paper alone does NOT grant this)
 * - Orphan createdBy=null  → admin department browse only
 */

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

/** Question + marking-scheme view/copy access: owned or explicitly shared. */
export async function getOwnedOrSharedPapersFilter(teacherId) {
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
 * @deprecated Prefer getOwnedOrSharedPapersFilter for schemes,
 * getOwnedPapersFilter for create, getTeacherSubmissionMongoFilter for reviews.
 */
export async function getTeacherPaperFilter(teacherId) {
  return getOwnedOrSharedPapersFilter(teacherId);
}

/**
 * Student submissions / essay review access.
 * Sharing a question paper does not share student answers.
 */
export async function getTeacherSubmissionMongoFilter(teacherId) {
  const scope = await getTeacherScope(teacherId);
  const classIds = await resolvePrimaryAssignedClassTwinIds(scope);
  const subjectIds = await resolveTeacherSubjectIds(teacherId);

  const ownedPaperIds = await EssayQuestion.find({
    createdBy: teacherId,
  }).distinct("_id");

  const clauses = [];

  if (ownedPaperIds.length > 0) {
    clauses.push({ question: { $in: ownedPaperIds } });
  }

  if (classIds.length > 0 && subjectIds.length > 0) {
    const [subjectPaperIds, studentIds] = await Promise.all([
      EssayQuestion.find({ subject: { $in: subjectIds } }).distinct("_id"),
      StudentProfile.find({ class: { $in: classIds } }).distinct("_id"),
    ]);

    if (subjectPaperIds.length > 0 && studentIds.length > 0) {
      clauses.push({
        question: { $in: subjectPaperIds },
        student: { $in: studentIds },
      });
    }
  }

  if (!clauses.length) {
    return { _id: { $in: [] } };
  }

  return { $or: clauses };
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
