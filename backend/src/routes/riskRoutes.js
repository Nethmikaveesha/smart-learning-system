import express from "express";
import axios from "axios";
import StudentRisk from "../models/StudentRisk.js";
import FinalRisk from "../models/FinalRisk.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";

const router = express.Router();
router.post("/predict", async (req, res) => {
  try {
    const { studentId, ...studentData } = req.body;

    const mlResponse = await axios.post(
      "http://127.0.0.1:5000/predict-risk",
      studentData
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

    res.json({
      success: true,
      performance_class: performanceClass,
      risk_level: riskLevel,
      saved_data: savedRisk,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ML prediction failed",
      error: error.message,
    });
  }
});

// Get all student risk predictions
router.get("/", async (req, res) => {
  try {
    const risks = await StudentRisk.find()
      .sort({ createdAt: -1 });

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

// Final Pass/Fail risk prediction
router.post("/final-predict", async (req, res) => {
  try {
    const { studentId, ...studentData } = req.body;

    const mlResponse = await axios.post(
      "http://127.0.0.1:5000/predict-final-risk",
      studentData
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
    });
  }
});
// Get all final Pass/Fail risk predictions
router.get("/final", async (req, res) => {
  try {
    const finalRisks = await FinalRisk.find()
      .sort({ createdAt: -1 });

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
// Auto final Pass/Fail prediction using system database data
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

    const results = await Result.find({
      student: studentProfileId,
    }).sort({ createdAt: -1 });

    const latestResult = results[0];

    if (!latestResult) {
      return res.status(404).json({
        success: false,
        message: "No exam result found for this student",
      });
    }

    const attendance_pct = studentProfile.attendancePercentage || 0;
    const midterm_score = latestResult.marks || 0;

    // Temporary values until Homework and Study Hours modules are added
    const homework_pct = req.body.homework_pct || 75;
    const study_hours_per_week = req.body.study_hours_per_week || 8;

    const studentData = {
      attendance_pct,
      homework_pct,
      midterm_score,
      study_hours_per_week,
    };

    const mlResponse = await axios.post(
  "http://127.0.0.1:5000/predict-final-risk",
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
    "Auto Risk Error:",
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
export default router;