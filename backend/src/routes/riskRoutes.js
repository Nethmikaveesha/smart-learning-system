import express from "express";
import axios from "axios";

import Attendance from "../models/Attendance.js";
import CommerceRisk from "../models/CommerceRisk.js";
import FinalRisk from "../models/FinalRisk.js";
import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import StudentRisk from "../models/StudentRisk.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Flask ML API base URL.
const ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:5000";

/**
 * Students/parents may only run predictions for their own linked profile.
 * Admins and teachers can access any student profile.
 */
async function assertCanAccessStudentProfile(req, studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId);

  if (!profile) {
    return {
      ok: false,
      status: 404,
      message: "Student profile not found",
    };
  }

  const role = req.user?.role;
  const userId = String(req.user?._id || "");

  if (role === "admin" || role === "teacher") {
    return { ok: true, profile };
  }

  if (role === "student" && String(profile.user) === userId) {
    return { ok: true, profile };
  }

  if (role === "parent" && String(profile.parent) === userId) {
    return { ok: true, profile };
  }

  return {
    ok: false,
    status: 403,
    message: "Access denied for this student profile",
  };
}

function requireCommerceMarks(studentData) {
  const required = [
    "Accounting_Score",
    "Business_Studies_Score",
    "Economics_Score",
    "Attendance_Percentage",
  ];

  const missing = required.filter((key) => {
    const value = studentData[key];
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      Number.isNaN(Number(value))
    );
  });

  if (missing.length) {
    return `Missing or invalid Commerce marks: ${missing.join(
      ", "
    )}. Enter Accounting, Business Studies, Economics scores and attendance percentage.`;
  }

  const values = required.map((key) => Number(studentData[key]));
  if (values.some((value) => value < 0 || value > 100)) {
    return "All marks and attendance must be between 0 and 100";
  }

  return null;
}

function toCommerceInputData(values) {
  return {
    accountingScore: Number(values.Accounting_Score),
    businessStudiesScore: Number(values.Business_Studies_Score),
    economicsScore: Number(values.Economics_Score),
    attendancePercentage: Number(values.Attendance_Percentage),
  };
}

function isValidRiskLevel(riskLevel) {
  return ["Low Risk", "Medium Risk", "High Risk"].includes(riskLevel);
}

// Every /api/risk route requires a valid login token.
router.use(protect);

/**
 * Optional xAPI benchmark prediction — staff only.
 */
router.post(
  "/predict",
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { studentId, ...studentData } = req.body;

      const mlResponse = await axios.post(
        `${ML_API_URL}/predict-risk`,
        studentData,
        {
          headers: { "Content-Type": "application/json" },
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
  }
);

router.get("/", authorizeRoles("admin", "teacher"), async (req, res) => {
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

router.post(
  "/final-predict",
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { studentId, ...studentData } = req.body;

      const mlResponse = await axios.post(
        `${ML_API_URL}/predict-final-risk`,
        studentData,
        {
          headers: { "Content-Type": "application/json" },
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
  }
);

router.get("/final", authorizeRoles("admin", "teacher"), async (req, res) => {
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

/** Saved Commerce Stream Model predictions — staff list. */
router.get(
  "/commerce",
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const predictions = await CommerceRisk.find()
        .populate({
          path: "studentProfile",
          populate: {
            path: "user",
            select: "fullName email",
          },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        model: "Commerce Stream Model",
        count: predictions.length,
        data: predictions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch Commerce risk predictions",
        error: error.message,
      });
    }
  }
);

/**
 * One student's Commerce prediction history.
 * Parent/student may only read their own linked profile.
 */
router.get(
  "/commerce/student/:studentProfileId",
  authorizeRoles("admin", "teacher", "student", "parent"),
  async (req, res) => {
    try {
      const access = await assertCanAccessStudentProfile(
        req,
        req.params.studentProfileId
      );

      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
        });
      }

      const predictions = await CommerceRisk.find({
        studentProfile: req.params.studentProfileId,
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: predictions.length,
        data: predictions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch student risk history",
        error: error.message,
      });
    }
  }
);

router.post(
  "/final-predict-auto/:studentProfileId",
  authorizeRoles("admin", "teacher", "parent", "student"),
  async (req, res) => {
    try {
      const { studentProfileId } = req.params;
      const access = await assertCanAccessStudentProfile(req, studentProfileId);

      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
        });
      }

      const studentProfile = access.profile;

      const latestResult = await Result.findOne({
        student: studentProfileId,
      }).sort({ createdAt: -1 });

      if (!latestResult) {
        return res.status(404).json({
          success: false,
          message:
            "No exam marks found for this student. Enter marks before running a risk prediction.",
        });
      }

      const attendance_pct =
        req.body.attendance_pct ??
        req.body.attendancePercentage ??
        studentProfile.attendancePercentage ??
        null;

      if (attendance_pct === null || attendance_pct === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "Attendance percentage is missing. Mark attendance or provide attendance_pct.",
        });
      }

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
          headers: { "Content-Type": "application/json" },
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
  }
);

router.post(
  "/multi-class-predict",
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const {
        studentProfileId,
        studentId,
        Accounting_Score,
        Business_Studies_Score,
        Economics_Score,
        Attendance_Percentage,
      } = req.body;

      if (!studentProfileId || !studentId) {
        return res.status(400).json({
          success: false,
          message: "Student profile and student ID are required",
        });
      }

      const values = {
        Accounting_Score,
        Business_Studies_Score,
        Economics_Score,
        Attendance_Percentage,
      };

      const validationError = requireCommerceMarks(values);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const payload = {
        Accounting_Score: Number(Accounting_Score),
        Business_Studies_Score: Number(Business_Studies_Score),
        Economics_Score: Number(Economics_Score),
        Attendance_Percentage: Number(Attendance_Percentage),
      };

      const mlResponse = await axios.post(
        `${ML_API_URL}/predict-multi-class-risk`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const riskLevel = mlResponse.data.risk_level;

      if (!isValidRiskLevel(riskLevel)) {
        return res.status(502).json({
          success: false,
          message: "ML service returned an invalid risk level",
        });
      }

      const savedPrediction = await CommerceRisk.create({
        studentProfile: studentProfileId,
        studentId: String(studentId).trim(),
        inputData: toCommerceInputData(payload),
        riskLevel,
        predictionSource: "Manual",
        predictedBy: req.user?._id,
      });

      return res.status(201).json({
        success: true,
        message: "Commerce risk prediction completed",
        model: "Commerce Stream Model",
        risk_level: riskLevel,
        data: savedPrediction,
        saved_data: savedPrediction,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Commerce risk prediction failed",
        error: error.response?.data?.message || error.message,
      });
    }
  }
);

router.post(
  "/multi-class-predict-auto/:studentProfileId",
  authorizeRoles("admin", "teacher", "parent", "student"),
  async (req, res) => {
    try {
      const { studentProfileId } = req.params;
      const access = await assertCanAccessStudentProfile(req, studentProfileId);

      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
        });
      }

      const studentProfile = access.profile;

      const results = await Result.find({
        student: studentProfileId,
      })
        .populate({
          path: "exam",
          populate: { path: "subject", select: "subjectName name" },
        })
        .sort({ createdAt: -1 })
        .limit(30);

      const getSubjectMark = (subjectKeyword) => {
        const matchedResult = results.find((result) => {
          const subjectName =
            result.exam?.subject?.subjectName ||
            result.exam?.subject?.name ||
            result.exam?.subjectName ||
            result.exam?.title ||
            "";

          return String(subjectName)
            .toLowerCase()
            .includes(subjectKeyword.toLowerCase());
        });

        return matchedResult?.marks ?? null;
      };

      // No silent defaults (65/75) — missing marks must fail clearly.
      const accountingMark =
        req.body.Accounting_Score ??
        req.body.accountingScore ??
        getSubjectMark("accounting");

      const businessStudiesMark =
        req.body.Business_Studies_Score ??
        req.body.businessStudiesScore ??
        getSubjectMark("business");

      const economicsMark =
        req.body.Economics_Score ??
        req.body.economicsScore ??
        getSubjectMark("economics");

      if (
        accountingMark == null ||
        businessStudiesMark == null ||
        economicsMark == null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Accounting, Business Studies and Economics marks are required before generating a Commerce risk prediction",
        });
      }

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
        null;

      if (attendancePercentage == null) {
        return res.status(400).json({
          success: false,
          message:
            "Attendance records are required before generating a risk prediction",
        });
      }

      const payload = {
        Accounting_Score: Number(accountingMark),
        Business_Studies_Score: Number(businessStudiesMark),
        Economics_Score: Number(economicsMark),
        Attendance_Percentage: Number(attendancePercentage),
      };

      const validationError = requireCommerceMarks(payload);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const mlResponse = await axios.post(
        `${ML_API_URL}/predict-multi-class-risk`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      const riskLevel = mlResponse.data.risk_level;

      if (!isValidRiskLevel(riskLevel)) {
        return res.status(502).json({
          success: false,
          message: "ML service returned an invalid risk level",
        });
      }

      const savedPrediction = await CommerceRisk.create({
        studentProfile: studentProfileId,
        studentId: studentProfile.studentId || String(studentProfile.user || studentProfileId),
        inputData: toCommerceInputData(payload),
        riskLevel,
        predictionSource: "Automatic",
        predictedBy: req.user?._id,
      });

      // Keep profile riskStatus in sync for teacher dashboards (High / Medium / Low).
      const shortStatus = String(riskLevel).replace(/ Risk$/i, "").trim();
      if (["High", "Medium", "Low"].includes(shortStatus)) {
        studentProfile.riskStatus = shortStatus;
        await studentProfile.save();
      }

      return res.status(201).json({
        success: true,
        message: "Commerce risk prediction completed",
        model: "Commerce Stream Model",
        studentProfileId,
        inputData: payload,
        risk_level: riskLevel,
        saved_data: savedPrediction,
      });
    } catch (error) {
      console.error(
        "Commerce Risk Error:",
        error.response?.status,
        error.response?.data || error.message
      );

      return res.status(500).json({
        success: false,
        message: "Commerce ML risk prediction failed",
        error: error.message,
        upstreamStatus: error.response?.status || null,
        upstreamData: error.response?.data || null,
      });
    }
  }
);

export default router;
