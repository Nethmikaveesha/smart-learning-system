import StudentProfile from "../models/StudentProfile.js";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import EssaySubmission from "../models/EssaySubmission.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { isPassingMark, getPassMark } from "../utils/grading.js";
import {
  dedupeResults,
  getSubjectName,
  sortResultsByLatest,
} from "../utils/studentResults.js";
import { buildTopicAnalytics } from "../utils/topicAnalytics.js";

async function getTeacherScope(teacherId) {
  const teacher = await User.findById(teacherId).select("fullName email");
  const classes = await Class.find({ assignedTeacher: teacherId }).select(
    "className academicYear"
  );

  const classIds = classes.map((item) => item._id);

  const students = await StudentProfile.find({
    class: { $in: classIds },
  }).select("_id studentId riskStatus attendancePercentage class subjects");

  const studentSubjectIds = [
    ...new Set(
      students.flatMap((student) =>
        (student.subjects || []).map((subjectId) => subjectId.toString())
      )
    ),
  ];

  const subjects = await Subject.find({
    $or: [{ assignedTeacher: teacherId }, { _id: { $in: studentSubjectIds } }],
  }).select("subjectName subjectCode");

  const subjectIds = subjects.map((item) => item._id);
  const studentIds = students.map((student) => student._id);
  const subjectIdStrings = subjectIds.map((id) => id.toString());

  return {
    teacher,
    classes,
    subjects,
    classIds,
    subjectIds,
    subjectIdStrings,
    students,
    studentIds,
  };
}

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
}) {
  const alerts = [];

  if (pendingSubmissions > 0) {
    alerts.push(
      `${pendingSubmissions} essay submission${pendingSubmissions > 1 ? "s are" : " is"} waiting for review.`
    );
  }

  const lowSubjects = new Set();

  results.forEach((result) => {
    if (Number(result.marks) < 50) {
      lowSubjects.add(getSubjectName(result));
    }
  });

  lowSubjects.forEach((subject) => {
    alerts.push(`1 student has low ${subject} performance.`);
  });

  if (incompleteAttendanceWeek) {
    alerts.push("Attendance records are incomplete for this week.");
  } else if (averageAttendance > 0 && averageAttendance < 75) {
    alerts.push("Class attendance is below the recommended level.");
  }

  return alerts;
}

export const getTeacherDashboard = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user._id);
    const { students, studentIds, subjects, classes, teacher } = scope;

    const totalStudents = students.length;
    const totalExams = await Exam.countDocuments({
      class: { $in: scope.classIds },
    });

    const rawResults = await Result.find({
      student: { $in: studentIds },
    }).populate({
      path: "exam",
      select: "examName examDate",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const results = sortResultsByLatest(dedupeResults(rawResults));
    const totalPublishedResults = results.length;

    const averageMarks =
      totalPublishedResults > 0
        ? Number(
            (
              results.reduce((sum, item) => sum + item.marks, 0) /
              totalPublishedResults
            ).toFixed(2)
          )
        : 0;

    const passMark = await getPassMark();
    const passCount = results.filter((item) =>
      isPassingMark(item.marks, passMark)
    ).length;
    const passRate =
      totalPublishedResults > 0
        ? Number(((passCount / totalPublishedResults) * 100).toFixed(2))
        : 0;

    const highRiskStudents = students.filter(
      (student) => student.riskStatus === "High"
    ).length;

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

    const scopedSubmissions = await EssaySubmission.find()
      .populate({
        path: "question",
        select: "subject",
        populate: { path: "subject", select: "_id subjectName" },
      })
      .lean();

    const teacherSubmissions = scopedSubmissions.filter((submission) => {
      const subjectId =
        submission.question?.subject?._id?.toString() ||
        submission.question?.subject?.toString();

      if (scope.subjectIdStrings.length === 0) return true;
      return scope.subjectIdStrings.includes(subjectId);
    });

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

    const recentAttendanceCount = await Attendance.countDocuments({
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
    });

    const pendingWork = [
      pendingSubmissions > 0
        ? `${pendingSubmissions} student submission${pendingSubmissions > 1 ? "s" : ""} need marking`
        : null,
      aiGradedNeedingConfirmation > 0
        ? `${aiGradedNeedingConfirmation} AI-graded essay${aiGradedNeedingConfirmation > 1 ? "s" : ""} need confirmation`
        : null,
      incompleteAttendanceWeek ? "1 attendance sheet is incomplete" : null,
    ].filter(Boolean);

    const recentResults = await Result.find({
      student: { $in: studentIds },
    })
      .populate({
        path: "student",
        populate: { path: "user", select: "fullName" },
      })
      .populate({
        path: "exam",
        select: "examName examDate",
        populate: { path: "subject", select: "subjectName" },
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const previewResults = sortResultsByLatest(
      dedupeResults(recentResults)
    ).slice(0, 5);

    res.status(200).json({
      teacher: {
        fullName: teacher?.fullName,
        email: teacher?.email,
      },
      classes: classes.map((item) => item.className),
      subjects: subjects.map((item) => item.subjectName),
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
