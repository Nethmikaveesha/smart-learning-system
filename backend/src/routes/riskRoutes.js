import express from "express";
import axios from "axios";
import StudentRisk from "../models/StudentRisk.js";
import FinalRisk from "../models/FinalRisk.js";

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
export default router;