import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import {
  dedupeResults,
  sortResultsByLatest,
} from "../utils/studentResults.js";
import { getPassMark, isPassingMark } from "../utils/grading.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key) {
  if (!key) return "Unknown";
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1] || month} ${year}`;
}

async function getAttendanceAtDate(studentId, targetDate, fallbackPercentage = 0) {
  const records = await Attendance.find({
    student: studentId,
    date: { $lte: targetDate },
  });

  if (records.length === 0) {
    return fallbackPercentage;
  }

  const presentDays = records.filter((record) => record.status === "Present").length;
  return Math.round((presentDays / records.length) * 100);
}

async function resolveStudentsForUser(req) {
  if (req.user?.role === "student") {
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    });

    return studentProfile ? [studentProfile] : [];
  }

  if (req.user?.role === "parent") {
    const query = linkedStudentsQuery(req.user._id);

    if (req.query.studentId) {
      query.studentId = req.query.studentId;
    }

    return StudentProfile.find(query);
  }

  return StudentProfile.find();
}

function hasMeaningfulStudentData(student, averageMarks) {
  return Number(student.attendancePercentage) > 0 || Number(averageMarks) > 0;
}

async function buildPeriodCorrelation(student) {
  const rawResults = await Result.find({
    student: student._id,
  }).populate({
    path: "exam",
    select: "examName examDate",
    populate: {
      path: "subject",
      select: "subjectName",
    },
  });

  const results = sortResultsByLatest(dedupeResults(rawResults)).reverse();

  if (results.length < 2) {
    return {
      chartData: [],
      message:
        "More attendance and examination records are required to calculate the correlation.",
    };
  }

  const chartData = [];

  for (const result of results) {
    const examDate = result.exam?.examDate || result.createdAt;
    const attendance = await getAttendanceAtDate(
      student._id,
      examDate,
      student.attendancePercentage
    );

    chartData.push({
      studentId: student.studentId,
      period: result.exam?.examName,
      attendance,
      averageMarks: Number(result.marks),
      grade: result.grade || "N/A",
    });
  }

  return { chartData };
}

export const attendanceMarksCorrelation = async (req, res) => {
  try {
    const students = await resolveStudentsForUser(req);

    if (req.user?.role === "student" && students.length === 0) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    if (req.user?.role === "parent" || req.user?.role === "student") {
      const correlation = await buildPeriodCorrelation(students[0]);
      return res.status(200).json(correlation.chartData);
    }

    const chartData = [];

    for (const student of students) {
      const results = await Result.find({
        student: student._id,
      });

      let averageMarks = 0;

      if (results.length > 0) {
        averageMarks =
          results.reduce((sum, item) => sum + item.marks, 0) / results.length;
      }

      if (!hasMeaningfulStudentData(student, averageMarks)) {
        continue;
      }

      chartData.push({
        studentId: student.studentId,
        attendance: student.attendancePercentage,
        averageMarks: Number(averageMarks.toFixed(2)),
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const attendanceGradesCorrelation = async (req, res) => {
  try {
    const students = await resolveStudentsForUser(req);

    if (req.user?.role === "student" && students.length === 0) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    if (req.user?.role === "parent" || req.user?.role === "student") {
      const correlation = await buildPeriodCorrelation(students[0]);
      return res.status(200).json(correlation.chartData);
    }

    const chartData = [];

    for (const student of students) {
      const results = await Result.find({
        student: student._id,
      });

      let averageMarks = 0;

      if (results.length > 0) {
        averageMarks =
          results.reduce((sum, item) => sum + item.marks, 0) / results.length;
      }

      if (!hasMeaningfulStudentData(student, averageMarks)) {
        continue;
      }

      let grade = "N/A";

      if (averageMarks >= 75) grade = "A";
      else if (averageMarks >= 65) grade = "B";
      else if (averageMarks >= 55) grade = "C";
      else if (averageMarks >= 40) grade = "S";
      else if (averageMarks > 0) grade = "F";

      chartData.push({
        studentId: student.studentId,
        attendance: student.attendancePercentage,
        averageMarks: Number(averageMarks.toFixed(2)),
        grade,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Institutional long-term trends for Admin System Analytics:
 * monthly average marks + pass rate, subject comparison, subject trends over time.
 */
export const getInstitutionalTrends = async (req, res) => {
  try {
    const passMark = await getPassMark();

    const results = await Result.find()
      .populate({
        path: "exam",
        select: "examName examDate subject",
        populate: {
          path: "subject",
          select: "subjectName subjectCode",
        },
      })
      .sort({ createdAt: 1 });

    const monthlyMap = new Map();
    const subjectMap = new Map();
    const subjectMonthMap = new Map();

    for (const result of results) {
      const marks = Number(result.marks || 0);
      const examDate = result.exam?.examDate || result.createdAt;
      const key = monthKey(examDate);
      if (!key) continue;

      const subjectName =
        result.exam?.subject?.subjectName || "Unassigned Subject";

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: key,
          label: monthLabel(key),
          totalMarks: 0,
          count: 0,
          passCount: 0,
          failCount: 0,
        });
      }

      const monthBucket = monthlyMap.get(key);
      monthBucket.totalMarks += marks;
      monthBucket.count += 1;
      if (isPassingMark(marks, passMark)) monthBucket.passCount += 1;
      else monthBucket.failCount += 1;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          subject: subjectName,
          totalMarks: 0,
          count: 0,
          passCount: 0,
          failCount: 0,
        });
      }

      const subjectBucket = subjectMap.get(subjectName);
      subjectBucket.totalMarks += marks;
      subjectBucket.count += 1;
      if (isPassingMark(marks, passMark)) subjectBucket.passCount += 1;
      else subjectBucket.failCount += 1;

      const subjectMonthKey = `${subjectName}::${key}`;
      if (!subjectMonthMap.has(subjectMonthKey)) {
        subjectMonthMap.set(subjectMonthKey, {
          subject: subjectName,
          month: key,
          totalMarks: 0,
          count: 0,
        });
      }
      const sm = subjectMonthMap.get(subjectMonthKey);
      sm.totalMarks += marks;
      sm.count += 1;
    }

    const monthlyTrend = [...monthlyMap.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        month: item.month,
        label: item.label,
        averageMarks:
          item.count > 0
            ? Number((item.totalMarks / item.count).toFixed(2))
            : 0,
        passRate:
          item.count > 0
            ? Number(((item.passCount / item.count) * 100).toFixed(2))
            : 0,
        resultCount: item.count,
        passCount: item.passCount,
        failCount: item.failCount,
      }));

    const subjectComparison = [...subjectMap.values()]
      .map((item) => ({
        subject: item.subject,
        averageMarks:
          item.count > 0
            ? Number((item.totalMarks / item.count).toFixed(2))
            : 0,
        passRate:
          item.count > 0
            ? Number(((item.passCount / item.count) * 100).toFixed(2))
            : 0,
        resultCount: item.count,
        failCount: item.failCount,
      }))
      .sort((a, b) => a.averageMarks - b.averageMarks);

    const topSubjects = [...subjectComparison]
      .sort((a, b) => b.resultCount - a.resultCount)
      .slice(0, 4)
      .map((item) => item.subject);

    const subjectTrendChart = monthlyTrend.map((monthRow) => {
      const point = {
        month: monthRow.month,
        label: monthRow.label,
      };

      for (const subject of topSubjects) {
        const bucket = subjectMonthMap.get(`${subject}::${monthRow.month}`);
        point[subject] =
          bucket && bucket.count > 0
            ? Number((bucket.totalMarks / bucket.count).toFixed(2))
            : null;
      }

      return point;
    });

    const totalStudents = await StudentProfile.countDocuments();
    const highRiskStudents = await StudentProfile.countDocuments({
      riskStatus: "High",
    });
    const mediumRiskStudents = await StudentProfile.countDocuments({
      riskStatus: "Medium",
    });

    const overallAverage =
      results.length > 0
        ? Number(
            (
              results.reduce((sum, item) => sum + Number(item.marks || 0), 0) /
              results.length
            ).toFixed(2)
          )
        : 0;

    const overallPassRate =
      results.length > 0
        ? Number(
            (
              (results.filter((item) => isPassingMark(item.marks, passMark))
                .length /
                results.length) *
              100
            ).toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,
      passMark,
      summary: {
        totalStudents,
        totalResults: results.length,
        overallAverage,
        overallPassRate,
        highRiskStudents,
        mediumRiskStudents,
        monthsCovered: monthlyTrend.length,
        subjectsCovered: subjectComparison.length,
      },
      monthlyTrend,
      subjectComparison,
      topSubjects,
      subjectTrendChart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
