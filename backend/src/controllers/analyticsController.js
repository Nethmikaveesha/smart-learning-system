import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import {
  dedupeResults,
  sortResultsByLatest,
} from "../utils/studentResults.js";

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
    const query = { parent: req.user._id };

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
