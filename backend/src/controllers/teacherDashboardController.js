import StudentProfile from "../models/StudentProfile.js";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";
import EssaySubmission from "../models/EssaySubmission.js";
import Attendance from "../models/Attendance.js";
import CommerceRisk from "../models/CommerceRisk.js";
import { isPassingMark, getPassMark } from "../utils/grading.js";
import {
  dedupeResults,
  getSubjectName,
  sortResultsByLatest,
} from "../utils/studentResults.js";
import { buildTopicAnalytics } from "../utils/topicAnalytics.js";
import {
  getTeacherScope,
  resolvePrimaryAssignedClassTwinIds,
} from "../utils/teacherScope.js";

function buildClassPerformance(results, subjects) {
  return subjects
    .map((subject) => {
      const subjectResults = results.filter(
        (result) =>
          result.exam?.subject?._id?.toString() === subject._id.toString() ||
          getSubjectName(result) === subject.subjectName
      );

      if (subjectResults.length === 0) {
        return null;
      }

      const average =
        subjectResults.reduce((sum, result) => sum + Number(result.marks || 0), 0) /
        subjectResults.length;

      return {
        subject: subject.subjectName,
        averageMarks: Number(average.toFixed(2)),
      };
    })
    .filter(Boolean);
}

function buildAlerts({
  pendingSubmissions,
  results,
  averageAttendance,
  incompleteAttendanceWeek,
  passMark,
}) {
  const alerts = [];

  if (pendingSubmissions > 0) {
    alerts.push(
      `${pendingSubmissions} essay submission${pendingSubmissions > 1 ? "s are" : " is"} waiting for review.`
    );
  }

  const lowBySubject = new Map();
  results.forEach((result) => {
    if (!isPassingMark(result.marks, passMark)) {
      const subject = getSubjectName(result) || "Subject";
      lowBySubject.set(subject, (lowBySubject.get(subject) || 0) + 1);
    }
  });

  lowBySubject.forEach((count, subject) => {
    alerts.push(
      `${count} result${count > 1 ? "s are" : " is"} below the pass mark in ${subject}.`
    );
  });

  if (incompleteAttendanceWeek) {
    alerts.push("Attendance records are incomplete for this week.");
  } else if (averageAttendance > 0 && averageAttendance < 75) {
    alerts.push("Class attendance is below the recommended level.");
  }

  return alerts;
}

async function countHighRiskStudents(studentIds = []) {
  if (!studentIds.length) return 0;

  const latestRiskByStudent = await CommerceRisk.aggregate([
    { $match: { studentProfile: { $in: studentIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$studentProfile",
        riskLevel: { $first: "$riskLevel" },
      },
    },
    {
      $match: {
        riskLevel: { $regex: /^High(\s+Risk)?$/i },
      },
    },
  ]);

  return latestRiskByStudent.length;
}

export const getTeacherDashboard = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user._id);
    const { subjects, teacher } = scope;

    // Same rule for every teacher (old + newly added):
    // dashboard stats use the admin-assigned class (+ year twins) and
    // assigned subject(s). No separate legacy-only path.
    const allowedClassIds = await resolvePrimaryAssignedClassTwinIds(scope);
    const allowedClassIdStrings = allowedClassIds.map((id) => String(id));

    const students =
      allowedClassIds.length > 0
        ? await StudentProfile.find({ class: { $in: allowedClassIds } }).select(
            "_id studentId riskStatus attendancePercentage class subjects parent"
          )
        : [];
    const studentIds = students.map((student) => student._id);

    const totalStudents = students.length;

    const examFilter = {};
    if (allowedClassIds.length > 0) {
      examFilter.class = { $in: allowedClassIds };
    } else {
      examFilter._id = { $in: [] };
    }
    if (scope.subjectIds.length > 0) {
      examFilter.subject = { $in: scope.subjectIds };
    }

    const totalExams =
      allowedClassIds.length === 0 ? 0 : await Exam.countDocuments(examFilter);

    const rawResults =
      studentIds.length === 0
        ? []
        : await Result.find({
            student: { $in: studentIds },
          }).populate({
            path: "exam",
            select: "examName examDate subject class",
            populate: {
              path: "subject",
              select: "subjectName",
            },
          });

    // Keep marks that belong to this teacher's assigned subjects (+ class).
    const scopedRawResults = rawResults.filter((result) => {
      if (scope.subjectIdStrings.length === 0) return false;
      const subjectId =
        result.exam?.subject?._id?.toString() ||
        result.exam?.subject?.toString();
      const classId =
        result.exam?.class?._id?.toString() ||
        result.exam?.class?.toString();

      const subjectOk = subjectId
        ? scope.subjectIdStrings.includes(subjectId)
        : scope.subjectLabels.includes(getSubjectName(result));
      if (!subjectOk) return false;

      if (classId && allowedClassIdStrings.length > 0) {
        return allowedClassIdStrings.includes(String(classId));
      }
      return allowedClassIdStrings.length === 0;
    });

    const results = sortResultsByLatest(dedupeResults(scopedRawResults));
    const totalPublishedResults = results.length;

    const averageMarks =
      totalPublishedResults > 0
        ? Number(
            (
              results.reduce((sum, item) => sum + Number(item.marks || 0), 0) /
              totalPublishedResults
            ).toFixed(2)
          )
        : null;

    const passMark = await getPassMark();
    const passCount = results.filter((item) =>
      isPassingMark(item.marks, passMark)
    ).length;
    // null = no published results yet; 0 = published results but none passed.
    const passRate =
      totalPublishedResults > 0
        ? Number(((passCount / totalPublishedResults) * 100).toFixed(2))
        : null;

    // Profile.riskStatus defaults to Low — only CommerceRisk assessments count.
    const highRiskStudents = await countHighRiskStudents(studentIds);

    const attendanceValues = students
      .map((student) => Number(student.attendancePercentage) || 0)
      .filter((value) => value > 0);

    const averageAttendance =
      attendanceValues.length > 0
        ? Number(
            (
              attendanceValues.reduce((sum, value) => sum + value, 0) /
              attendanceValues.length
            ).toFixed(2)
          )
        : 0;

    const scopedSubmissions =
      scope.subjectIdStrings.length === 0
        ? []
        : (
            await EssaySubmission.find()
              .populate({
                path: "question",
                select: "subject createdBy",
                populate: { path: "subject", select: "_id subjectName" },
              })
              .lean()
          ).filter((submission) => {
            const subjectId =
              submission.question?.subject?._id?.toString() ||
              submission.question?.subject?.toString();
            return subjectId && scope.subjectIdStrings.includes(subjectId);
          });

    const teacherSubmissions = scopedSubmissions;

    const pendingSubmissions = teacherSubmissions.filter(
      (submission) => submission.status === "Pending"
    ).length;

    const ungradedEssays = teacherSubmissions.filter(
      (submission) =>
        submission.status === "Pending" ||
        submission.finalMarks === null ||
        submission.finalMarks === undefined
    ).length;

    const aiGradedNeedingConfirmation = teacherSubmissions.filter(
      (submission) =>
        submission.status === "Pending" &&
        Number(submission.nlpEvaluation?.marks || submission.marks || 0) > 0
    ).length;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const recentAttendanceCount =
      studentIds.length === 0
        ? 0
        : await Attendance.countDocuments({
            student: { $in: studentIds },
            date: { $gte: weekStart },
          });

    const incompleteAttendanceWeek =
      students.length > 0 && recentAttendanceCount < students.length;

    const topicAnalytics = await buildTopicAnalytics(scope.subjectIds);
    const classPerformance = buildClassPerformance(results, subjects);

    const alerts = buildAlerts({
      pendingSubmissions,
      results,
      averageAttendance,
      incompleteAttendanceWeek,
      passMark,
    });

    if (allowedClassIds.length === 0 && scope.subjectIds.length === 0) {
      alerts.unshift(
        "No class or subject has been assigned to you yet. Ask an admin to assign your teaching load."
      );
    }

    const pendingWork = [
      pendingSubmissions > 0
        ? `${pendingSubmissions} student submission${pendingSubmissions > 1 ? "s" : ""} need marking`
        : null,
      aiGradedNeedingConfirmation > 0
        ? `${aiGradedNeedingConfirmation} AI-graded essay${aiGradedNeedingConfirmation > 1 ? "s" : ""} need confirmation`
        : null,
      incompleteAttendanceWeek ? "1 attendance sheet is incomplete" : null,
    ].filter(Boolean);

    const recentResults =
      studentIds.length === 0
        ? []
        : await Result.find({
            student: { $in: studentIds },
          })
            .populate({
              path: "student",
              populate: { path: "user", select: "fullName" },
            })
            .populate({
              path: "exam",
              select: "examName examDate subject class",
              populate: { path: "subject", select: "subjectName" },
            })
            .sort({ createdAt: -1 })
            .limit(20);

    const scopedRecentResults = recentResults.filter((result) => {
      if (scope.subjectIdStrings.length === 0) return false;
      const subjectId =
        result.exam?.subject?._id?.toString() ||
        result.exam?.subject?.toString();
      const classId =
        result.exam?.class?._id?.toString() ||
        result.exam?.class?.toString();

      const subjectOk = subjectId
        ? scope.subjectIdStrings.includes(subjectId)
        : scope.subjectLabels.includes(getSubjectName(result));
      if (!subjectOk) return false;

      if (classId && allowedClassIdStrings.length > 0) {
        return allowedClassIdStrings.includes(String(classId));
      }
      return true;
    });

    const previewResults = sortResultsByLatest(
      dedupeResults(scopedRecentResults)
    ).slice(0, 5);

    const assignedClassLabels =
      scope.adminAssignedClassLabels?.length > 0
        ? scope.adminAssignedClassLabels
        : [];
    const assignedSubjectLabels =
      scope.adminAssignedSubjectLabels?.length > 0
        ? scope.adminAssignedSubjectLabels
        : scope.subjectLabels;

    const hasAssignments =
      allowedClassIds.length > 0 ||
      assignedSubjectLabels.length > 0 ||
      scope.subjectIds.length > 0;

    res.status(200).json({
      teacher: {
        fullName: teacher?.fullName,
        email: teacher?.email,
      },
      // Same labels for every teacher: admin assignment first.
      classes: assignedClassLabels,
      subjects: assignedSubjectLabels,
      assignmentSummary: {
        classCount: assignedClassLabels.length,
        subjectCount: assignedSubjectLabels.length,
        hasAssignments,
      },
      totalStudents,
      totalExams,
      pendingSubmissions,
      averageMarks,
      highRiskStudents,
      passRate,
      passCount,
      totalPublishedResults,
      averageAttendance,
      ungradedEssays,
      classPerformance,
      topicErrorSummary: topicAnalytics.summary,
      alerts,
      pendingWork,
      recentResults: previewResults,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getTeacherTopicErrorAnalytics = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user._id);
    const subjectId = req.query.subjectId || null;
    const analytics = await buildTopicAnalytics(scope.subjectIds, subjectId);

    res.status(200).json({
      success: true,
      subjects: scope.subjects,
      selectedSubjectId: subjectId,
      ...analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate topic error analytics",
      error: error.message,
    });
  }
};

/**
 * Score trends across exams for the teacher's classes/subjects.
 * Supports optional subject + student filters for an interactive chart.
 */
export const getTeacherScoreTrends = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user._id);
    const { subjectId, studentId } = req.query;

    const examFilter = {
      class: { $in: scope.classIds },
      subject: { $in: scope.subjectIds },
    };

    if (subjectId) {
      examFilter.subject = subjectId;
    }

    const exams = await Exam.find(examFilter)
      .populate("subject", "subjectName subjectCode")
      .populate("class", "className")
      .sort({ examDate: 1 });

    const examIds = exams.map((exam) => exam._id);

    const resultFilter = {
      exam: { $in: examIds },
      student: { $in: scope.studentIds },
    };

    if (studentId) {
      resultFilter.student = studentId;
    }

    const results = await Result.find(resultFilter)
      .populate("student", "studentId")
      .populate({
        path: "student",
        populate: { path: "user", select: "fullName" },
      });

    const resultsByExam = new Map();
    for (const result of results) {
      const key = result.exam.toString();
      if (!resultsByExam.has(key)) resultsByExam.set(key, []);
      resultsByExam.get(key).push(result);
    }

    const passMark = await getPassMark();

    const classTrend = exams.map((exam) => {
      const examResults = resultsByExam.get(exam._id.toString()) || [];
      const averageMarks =
        examResults.length > 0
          ? Number(
              (
                examResults.reduce((sum, item) => sum + Number(item.marks || 0), 0) /
                examResults.length
              ).toFixed(2)
            )
          : null;

      return {
        examId: exam._id,
        examName: exam.examName,
        examDate: exam.examDate,
        label: exam.examName,
        shortLabel:
          exam.examName.length > 18
            ? `${exam.examName.slice(0, 16)}…`
            : exam.examName,
        subject: exam.subject?.subjectName || "Subject",
        className: exam.class?.className || "Class",
        averageMarks,
        resultCount: examResults.length,
        passCount: examResults.filter((item) =>
          isPassingMark(item.marks, passMark)
        ).length,
      };
    });

    const chartPoints = classTrend
      .filter((point) => point.averageMarks !== null)
      .map((point) => ({
        name: point.shortLabel,
        examName: point.examName,
        averageMarks: point.averageMarks,
        resultCount: point.resultCount,
        examDate: point.examDate,
      }));

    const studentsWithNames = await StudentProfile.find({
      _id: { $in: scope.studentIds },
    })
      .populate("user", "fullName")
      .select("studentId user")
      .sort({ studentId: 1 });

    res.status(200).json({
      success: true,
      subjects: scope.subjects,
      classes: scope.classes,
      students: studentsWithNames.map((student) => ({
        _id: student._id,
        studentId: student.studentId,
        fullName: student.user?.fullName || student.studentId,
      })),
      selectedSubjectId: subjectId || "",
      selectedStudentId: studentId || "",
      examCount: exams.length,
      resultCount: results.length,
      passMark,
      classTrend,
      chartPoints,
      latestAverage:
        chartPoints.length > 0
          ? chartPoints[chartPoints.length - 1].averageMarks
          : null,
      overallAverage:
        chartPoints.length > 0
          ? Number(
              (
                chartPoints.reduce((sum, point) => sum + point.averageMarks, 0) /
                chartPoints.length
              ).toFixed(2)
            )
          : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load score trends",
      error: error.message,
    });
  }
};
