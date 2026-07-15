import express from "express";
import axios from "axios";

import Attendance from "../models/Attendance.js";
import FinalRisk from "../models/FinalRisk.js";
import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import StudentRisk from "../models/StudentRisk.js";

const router = express.Router();

// Flask ML API base URL.
// Add ML_API_URL=http://127.0.0.1:5000 to backend/.env if needed.
const ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:5000";

/**
 * Optional xAPI benchmark prediction.
 * This is mainly for research/demo value, not the main Commerce project flow.
 */
router.post("/predict", async (req, res) => {
  try {
    const { studentId, ...studentData } = req.body;

    const mlResponse = await axios.post(
      `${ML_API_URL}/predict-risk`,
      studentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const performanceClass = mlResponse.data.risk_status;

    let riskLevel = "Medium Risk";
    if (performanceClass === "H") riskLevel = "Low Risk";
    if (performanceClass === "M") riskLevel = "Medium Risk";
    if (performanceClass === "L") riskLevel = "High Risk";

    const savedRisk = await StudentRisk.create({
      studentId,
      inputData: studentData,
      performanceClass,
      riskLevel,
    });

    res.status(200).json({
      success: true,
      performance_class: performanceClass,
      risk_level: riskLevel,
      saved_data: savedRisk,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "xAPI ML prediction failed",
      error: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});

/**
 * Get all xAPI benchmark risk predictions.
 */
router.get("/", async (req, res) => {
  try {
    const risks = await StudentRisk.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: risks.length,
      data: risks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch risk predictions",
      error: error.message,
    });
  }
});

/**
 * Manual Pass/Fail risk prediction.
 * Frontend/body must send:
 * attendance_pct, homework_pct, midterm_score, study_hours_per_week
 */
router.post("/final-predict", async (req, res) => {
  try {
    const { studentId, ...studentData } = req.body;

    const mlResponse = await axios.post(
      `${ML_API_URL}/predict-final-risk`,
      studentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const savedFinalRisk = await FinalRisk.create({
      studentId,
      inputData: studentData,
      passPrediction: mlResponse.data.pass_prediction,
      predictedResult: mlResponse.data.predicted_result,
      riskLevel: mlResponse.data.risk_level,
    });

    res.status(200).json({
      success: true,
      pass_prediction: mlResponse.data.pass_prediction,
      predicted_result: mlResponse.data.predicted_result,
      risk_level: mlResponse.data.risk_level,
      saved_data: savedFinalRisk,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Final ML risk prediction failed",
      error: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});

/**
 * Get all Pass/Fail risk predictions.
 */
router.get("/final", async (req, res) => {
  try {
    const finalRisks = await FinalRisk.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: finalRisks.length,
      data: finalRisks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch final risk predictions",
      error: error.message,
    });
  }
});

/**
 * Auto Pass/Fail prediction using database data.
 * Uses latest Result marks as midterm_score.
 * Homework and study hours are temporary body/default values until those modules exist.
 */
router.post("/final-predict-auto/:studentProfileId", async (req, res) => {
  try {
    const { studentProfileId } = req.params;

    const studentProfile = await StudentProfile.findById(studentProfileId);

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const latestResult = await Result.findOne({
      student: studentProfileId,
    }).sort({ createdAt: -1 });

    if (!latestResult) {
      return res.status(404).json({
        success: false,
        message: "No exam result found for this student",
      });
    }

    const attendance_pct =
      req.body.attendance_pct ??
      req.body.attendancePercentage ??
      studentProfile.attendancePercentage ??
      75;

    const studentData = {
      attendance_pct: Number(attendance_pct),
      homework_pct: Number(req.body.homework_pct ?? 75),
      midterm_score: Number(req.body.midterm_score ?? latestResult.marks ?? 0),
      study_hours_per_week: Number(req.body.study_hours_per_week ?? 8),
    };

    const mlResponse = await axios.post(
      `${ML_API_URL}/predict-final-risk`,
      studentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const savedFinalRisk = await FinalRisk.create({
      studentId: studentProfile.user?.toString() || studentProfileId,
      inputData: studentData,
      passPrediction: mlResponse.data.pass_prediction,
      predictedResult: mlResponse.data.predicted_result,
      riskLevel: mlResponse.data.risk_level,
    });

    res.status(200).json({
      success: true,
      message: "Auto final risk prediction completed",
      studentProfileId,
      inputData: studentData,
      pass_prediction: mlResponse.data.pass_prediction,
      predicted_result: mlResponse.data.predicted_result,
      risk_level: mlResponse.data.risk_level,
      saved_data: savedFinalRisk,
    });
  } catch (error) {
    console.error(
      "Auto Pass/Fail Risk Error:",
      error.response?.status,
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Auto final ML risk prediction failed",
      error: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});

/**
 * Manual Commerce multi-class risk prediction.
 * Frontend/body must send:
 * Accounting_Score, Business_Studies_Score, Economics_Score, Attendance_Percentage
 */
router.post("/multi-class-predict", async (req, res) => {
  try {
    const { studentId, ...studentData } = req.body;

    const mlResponse = await axios.post(
      `${ML_API_URL}/predict-multi-class-risk`,
      studentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    res.status(200).json({
      success: true,
      model: "Commerce Multi-Class Risk Model",
      studentId,
      inputData: studentData,
      risk_level: mlResponse.data.risk_level,
      ml_response: mlResponse.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Commerce ML risk prediction failed",
      error: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});

/**
 * Auto Commerce multi-class prediction using database data.
 * It tries to extract Commerce subject marks from Result + Exam data.
 * If subject matching is not available, body values or safe defaults are used.
 */
router.post("/multi-class-predict-auto/:studentProfileId", async (req, res) => {
  try {
    const { studentProfileId } = req.params;

    const studentProfile = await StudentProfile.findById(studentProfileId);

    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const results = await Result.find({
      student: studentProfileId,
    })
      .populate("exam")
      .sort({ createdAt: -1 })
      .limit(20);

    const getSubjectMark = (subjectKeyword) => {
      const matchedResult = results.find((result) => {
        const subjectName =
          result.exam?.subject?.name ||
          result.exam?.subjectName ||
          result.exam?.title ||
          "";

        return subjectName
          .toLowerCase()
          .includes(subjectKeyword.toLowerCase());
      });

      return matchedResult?.marks || null;
    };

    const accountingMark =
      req.body.Accounting_Score ??
      req.body.accountingScore ??
      getSubjectMark("accounting") ??
      65;

    const businessStudiesMark =
      req.body.Business_Studies_Score ??
      req.body.businessStudiesScore ??
      getSubjectMark("business") ??
      65;

    const economicsMark =
      req.body.Economics_Score ??
      req.body.economicsScore ??
      getSubjectMark("economics") ??
      65;

    const totalAttendance = await Attendance.countDocuments({
      student: studentProfileId,
    });

    const presentAttendance = await Attendance.countDocuments({
      student: studentProfileId,
      status: "Present",
    });

    const calculatedAttendance =
      totalAttendance > 0
        ? Number(((presentAttendance / totalAttendance) * 100).toFixed(1))
        : null;

    const attendancePercentage =
      req.body.Attendance_Percentage ??
      req.body.attendancePercentage ??
      calculatedAttendance ??
      studentProfile.attendancePercentage ??
      75;

    const studentData = {
      Accounting_Score: Number(accountingMark),
      Business_Studies_Score: Number(businessStudiesMark),
      Economics_Score: Number(economicsMark),
      Attendance_Percentage: Number(attendancePercentage),
    };

    const mlResponse = await axios.post(
      `${ML_API_URL}/predict-multi-class-risk`,
      studentData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    res.status(200).json({
      success: true,
      message: "Commerce risk prediction completed",
      studentProfileId,
      inputData: studentData,
      risk_level: mlResponse.data.risk_level,
      ml_response: mlResponse.data,
    });
  } catch (error) {
    console.error(
      "Commerce Risk Error:",
      error.response?.status,
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Commerce ML risk prediction failed",
      error: error.message,
      upstreamStatus: error.response?.status || null,
      upstreamData: error.response?.data || null,
    });
  }
});

export default router;