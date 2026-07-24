import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  calculateGrade,
  isPassingMark,
  getPassMark,
} from "../utils/grading.js";

/**
 * Recalculate rank + Z-score for every result in one exam.
 * Rank 1 = highest marks. Single-student exams still get rank 1.
 */
async function recalculateExamAnalytics(examId) {
  const results = await Result.find({ exam: examId }).sort({ marks: -1 });

  if (results.length === 0) {
    return null;
  }

  const marksArray = results.map((result) => result.marks);
  const mean =
    marksArray.reduce((sum, mark) => sum + mark, 0) / marksArray.length;
  const variance =
    marksArray.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) /
    marksArray.length;
  const standardDeviation = Math.sqrt(variance);

  for (let i = 0; i < results.length; i++) {
    const zScore =
      standardDeviation === 0
        ? 0
        : Number(((results[i].marks - mean) / standardDeviation).toFixed(2));

    results[i].zScore = zScore;
    results[i].rank = i + 1;
    await results[i].save();
  }

  return {
    mean: Number(mean.toFixed(2)),
    standardDeviation: Number(standardDeviation.toFixed(2)),
    count: results.length,
  };
}

export const addResult = async (req, res) => {
  try {
    const { student, exam, marks } = req.body;

    const existingResult = await Result.findOne({ student, exam });

    if (existingResult) {
      return res.status(400).json({
        message:
          "A result already exists for this student, exam, and subject combination",
      });
    }

    const passMark = await getPassMark();

    await Result.create({
      student,
      exam,
      marks,
      grade: calculateGrade(marks, passMark),
      rank: 0,
    });

    // Real-world behavior: ranks/z-scores update as soon as marks are saved.
    await recalculateExamAnalytics(exam);

    const result = await Result.findOne({ student, exam })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("exam", "examName");

    const studentProfile = await StudentProfile.findById(student);

    let riskStatus = "Low";

    if (marks < passMark || studentProfile.attendancePercentage < 60) {
      riskStatus = "High";
    } else if (marks < 50 || studentProfile.attendancePercentage < 75) {
      riskStatus = "Medium";
    }

    await StudentProfile.findByIdAndUpdate(student, {
      riskStatus,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Results",
      description: `Result added with ${marks} marks. Risk status updated to ${riskStatus}. Rank/Z-score recalculated.`,
    });

    res.status(201).json({
      message: "Result added successfully",
      result,
      riskStatus,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A result already exists for this student, exam, and subject combination",
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllResults = async (req, res) => {
  try {
    // Heal older records that were saved before auto-ranking existed.
    const examsNeedingRank = await Result.distinct("exam", {
      $or: [{ rank: { $lte: 0 } }, { rank: null }],
    });

    for (const examId of examsNeedingRank) {
      await recalculateExamAnalytics(examId);
    }

    const results = await Result.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("exam", "examName");

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteResult = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate({
      path: "student",
      populate: { path: "user", select: "fullName" },
    });

    if (!result) {
      return res.status(404).json({
        message: "Result not found",
      });
    }

    const examId = result.exam;

    await result.deleteOne();

    // Keep remaining classmates' ranks correct after a delete.
    if (examId) {
      await recalculateExamAnalytics(examId);
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "DELETE",
      module: "Results",
      description: `Deleted result for ${result.student?.user?.fullName || "student"}`,
    });

    res.status(200).json({
      message: "Result deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const calculateExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;

    const analytics = await recalculateExamAnalytics(examId);

    if (!analytics) {
      return res.status(404).json({
        message: "No results found for this exam",
      });
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Results",
      description: "Exam analytics calculated including Z-scores and rankings",
    });

    const updatedResults = await Result.find({ exam: examId })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("exam", "examName");

    res.status(200).json({
      message: "Exam analytics calculated successfully",
      mean: analytics.mean,
      standardDeviation: analytics.standardDeviation,
      results: updatedResults,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const detectWeakStudents = async (req, res) => {
  try {
    const { examId } = req.params;

    const results = await Result.find({ exam: examId }).populate("student");

    if (results.length === 0) {
      return res.status(404).json({
        message: "No results found for this exam",
      });
    }

    const passMark = await getPassMark();
    const weakStudents = [];

    for (const result of results) {
      const studentProfile = result.student;

      let riskStatus = "Low";

      if (result.marks < passMark || studentProfile.attendancePercentage < 60) {
        riskStatus = "High";
      } else if (result.marks < 50 || studentProfile.attendancePercentage < 75) {
        riskStatus = "Medium";
      }

      await StudentProfile.findByIdAndUpdate(studentProfile._id, {
        riskStatus,
        currentZScore: result.zScore,
      });

      if (riskStatus !== "Low") {
        weakStudents.push({
          studentId: studentProfile.studentId,
          marks: result.marks,
          attendancePercentage: studentProfile.attendancePercentage,
          zScore: result.zScore,
          riskStatus,
        });
      }
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Risk Analysis",
      description: "Weak student detection completed",
    });

    res.status(200).json({
      message: "Weak student detection completed",
      weakStudents,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAnalyticsSummary = async (req, res) => {
  try {
    const totalStudents = await StudentProfile.countDocuments();

    const results = await Result.find();

    const totalResults = results.length;

    const averageMarks =
      totalResults > 0
        ? (
            results.reduce((sum, result) => sum + result.marks, 0) /
            totalResults
          ).toFixed(2)
        : 0;

    const passMark = await getPassMark();
    const passCount = results.filter((result) =>
      isPassingMark(result.marks, passMark)
    ).length;

    const failCount = results.filter(
      (result) => !isPassingMark(result.marks, passMark)
    ).length;

    const highRiskStudents = await StudentProfile.countDocuments({
      riskStatus: "High",
    });

    const studentProfiles = await StudentProfile.find();

    const averageAttendance =
      studentProfiles.length > 0
        ? (
            studentProfiles.reduce(
              (sum, student) => sum + student.attendancePercentage,
              0
            ) / studentProfiles.length
          ).toFixed(2)
        : 0;

    res.status(200).json({
      totalStudents,
      averageMarks,
      passCount,
      failCount,
      highRiskStudents,
      averageAttendance,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};