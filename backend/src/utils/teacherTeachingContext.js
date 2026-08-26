import StudentProfile from "../models/StudentProfile.js";
import {
  getTeacherScope,
  resolveClassTwinIds,
  resolvePrimaryAssignedClassTwinIds,
  resolveSubjectTwinIds,
} from "./teacherScope.js";
import { getSubjectName } from "./studentResults.js";

function uniqueIdStrings(ids = []) {
  return [...new Set(ids.map((id) => String(id)).filter(Boolean))];
}

/**
 * Shared teaching context for every teacher dashboard / analytics page.
 * Same rules for old lead teachers and newly added accounts:
 * - class: admin-assigned (+ year twins), else subject-linked admin fallback
 * - subjects: assigned subjects + catalog twins
 * - students: profiles in those class rows only
 */
export async function resolveTeacherTeachingContext(teacherId) {
  const scope = await getTeacherScope(teacherId);

  let classIds = await resolvePrimaryAssignedClassTwinIds(scope);

  if (!classIds.length && scope.adminAssignedClassIds?.length) {
    const twinLists = await Promise.all(
      scope.adminAssignedClassIds.map((classId) =>
        resolveClassTwinIds(classId, { ignoreYear: true })
      )
    );
    classIds = [
      ...new Map(
        twinLists.flat().map((id) => [String(id), id])
      ).values(),
    ];
  }

  const subjectIds =
    scope.subjectIds.length > 0
      ? await resolveSubjectTwinIds(scope.subjectIds)
      : [];

  const students =
    classIds.length > 0
      ? await StudentProfile.find({ class: { $in: classIds } }).select(
          "_id studentId riskStatus attendancePercentage class subjects parent"
        )
      : [];

  const studentIds = students.map((student) => student._id);
  const classIdStrings = uniqueIdStrings(classIds);
  const subjectIdStrings = uniqueIdStrings(subjectIds);

  const assignedClassLabels =
    scope.adminAssignedClassLabels?.length > 0
      ? scope.adminAssignedClassLabels
      : [];
  const assignedSubjectLabels =
    scope.adminAssignedSubjectLabels?.length > 0
      ? scope.adminAssignedSubjectLabels
      : scope.subjectLabels;

  return {
    scope,
    teacher: scope.teacher,
    subjects: scope.subjects,
    subjectLabels: scope.subjectLabels,
    classIds,
    classIdStrings,
    subjectIds,
    subjectIdStrings,
    students,
    studentIds,
    assignedClassLabels,
    assignedSubjectLabels,
    hasAssignments:
      classIds.length > 0 ||
      assignedSubjectLabels.length > 0 ||
      subjectIds.length > 0,
  };
}

/** Whether an exam result belongs to this teacher's teaching context. */
export function resultMatchesTeachingContext(result, ctx) {
  if (!ctx?.subjectIdStrings?.length) return false;

  const subjectId =
    result.exam?.subject?._id?.toString() ||
    result.exam?.subject?.toString() ||
    "";
  const classId =
    result.exam?.class?._id?.toString() ||
    result.exam?.class?.toString() ||
    "";

  const subjectOk = subjectId
    ? ctx.subjectIdStrings.includes(String(subjectId))
    : ctx.subjectLabels.includes(getSubjectName(result));
  if (!subjectOk) return false;

  if (classId && ctx.classIdStrings.length > 0) {
    return ctx.classIdStrings.includes(String(classId));
  }

  // No exam class pointer: only keep when teacher has no class filter.
  return ctx.classIdStrings.length === 0;
}
