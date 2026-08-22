import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  calculateGrade,
  isPassingMark,
  getPassMark,
} from "../utils/grading.js";
import { assertCanAccessStudentProfile } from "../utils/studentAccess.js";
import { getTeacherScope } from "../utils/teacherScope.js";
import Exam from "../models/Exam.js";

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

    if (!student || !exam || marks === undefined || marks === null || marks === "") {
      return res.status(400).json({
        message: "student, exam, and marks are required",
      });
    }

    const numericMarks = Number(marks);
    if (Number.isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
      return res.status(400).json({
        message: "marks must be a number between 0 and 100",
      });
    }

    const access = await assertCanAccessStudentProfile(req, student);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);
      const examRecord = await Exam.findById(exam).select("class subject");
      const examAllowed =
        examRecord &&
        (scope.classIdStrings.includes(String(examRecord.class || "")) ||
          scope.subjectIdStrings.includes(String(examRecord.subject || "")));

      if (!examAllowed) {
        return res.status(403).json({
          message: "You can only add marks for exams in your assigned classes or subjects",
        });
      }
    }

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
      marks: numericMarks,
      grade: calculateGrade(numericMarks, passMark),
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

    // Do not overwrite Commerce Stream Model riskStatus with mark heuristics.
    // Only refresh the student's current Z-score from this exam result.
    await StudentProfile.findByIdAndUpdate(student, {
      currentZScore: result.zScore,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Results",
      description: `Result added with ${numericMarks} marks. Rank/Z-score recalculated.`,
    });

    res.status(201).json({
      message: "Result added successfully",
      result,
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

export const updateResult = async (req, res) => {
  try {
    const { marks } = req.body;

    if (marks === undefined || marks === null || marks === "") {
      return res.status(400).json({ message: "marks are required" });
    }

    const numericMarks = Number(marks);
    if (Number.isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
      return res.status(400).json({
        message: "marks must be a number between 0 and 100",
      });
    }

    const existing = await Result.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Result not found" });
    }

    const access = await assertCanAccessStudentProfile(req, existing.student);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const passMark = await getPassMark();
    existing.marks = numericMarks;
    existing.grade = calculateGrade(numericMarks, passMark);
    await existing.save();

    await recalculateExamAnalytics(existing.exam);

    const result = await Result.findById(existing._id)
      .populate({
        path: "student",
        populate: { path: "user", select: "fullName" },
      })
      .populate("exam", "examName");

    await StudentProfile.findByIdAndUpdate(result.student._id || result.student, {
      currentZScore: result.zScore,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Results",
      description: `Result updated to ${numericMarks} marks. Rank/Z-score recalculated.`,
    });

    res.status(200).json({
      message: "Result updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const filter = {};

    if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);

      // Only results for this teacher's assigned students + subjects.
      if (scope.studentIds.length === 0 || scope.subjectIds.length === 0) {
        return res.status(200).json([]);
      }

      let allowedSubjectIds = scope.subjectIds;
      const requestedSubjectId = req.query.subjectId
        ? String(req.query.subjectId)
        : "";

      // Optional subject filter (Z-Scores page always sends one).
      if (requestedSubjectId) {
        if (!scope.subjectIdStrings.includes(requestedSubjectId)) {
          return res.status(200).json([]);
        }
        allowedSubjectIds = scope.subjectIds.filter(
          (id) => String(id) === requestedSubjectId
        );
      }

      const examFilter = {
        subject: { $in: allowedSubjectIds },
      };
      if (scope.classIds.length > 0) {
        examFilter.class = { $in: scope.classIds };
      }

      const examIds = await Exam.find(examFilter).distinct("_id");
      if (examIds.length === 0) {
        return res.status(200).json([]);
      }

      filter.student = { $in: scope.studentIds };
      filter.exam = { $in: examIds };
    } else if (req.query.subjectId) {
      // Admin (and other roles with access) can also narrow by subject.
      const examIds = await Exam.find({
        subject: String(req.query.subjectId),
      }).distinct("_id");
      if (examIds.length === 0) {
        return res.status(200).json([]);
      }
      filter.exam = { $in: examIds };
    }

    const results = await Result.find(filter)
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate({
        path: "exam",
        select: "examName examDate",
        populate: {
          path: "subject",
          select: "subjectName subjectCode",
        },
      })
      .sort({ createdAt: -1 });

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
    let studentFilter = {};
    let resultFilter = {};

    if (req.user?.role === "teacher") {
      const scope = await getTeacherScope(req.user._id);
      if (scope.studentIds.length === 0) {
        return res.status(200).json({
          totalStudents: 0,
          averageMarks: 0,
          passCount: 0,
          failCount: 0,
          highRiskStudents: 0,
          averageAttendance: 0,
        });
      }
      studentFilter = { _id: { $in: scope.studentIds } };
      resultFilter = { student: { $in: scope.studentIds } };
    }

    const totalStudents = await StudentProfile.countDocuments(studentFilter);

    const results = await Result.find(resultFilter);

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
      ...studentFilter,
      riskStatus: "High",
    });

    const studentProfiles = await StudentProfile.find(studentFilter);

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