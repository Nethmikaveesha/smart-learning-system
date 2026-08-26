import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
import CommerceRisk from "../models/CommerceRisk.js";
import { buildStudentAcademicSnapshot } from "../utils/studentAcademicSnapshot.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const studentProfile = await StudentProfile.findOne({
      user: userId,
    })
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName subjectCode");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const academic = await buildStudentAcademicSnapshot(studentProfile);

    const attendanceRecords = await Attendance.find({
      student: studentProfile._id,
    }).sort({ date: -1 });

    // Profile riskStatus defaults to "Low" and is NOT a Commerce model result.
    // Only a saved CommerceRisk run counts as an assessed risk on the dashboard.
    const latestCommerceRisk = await CommerceRisk.findOne({
      studentProfile: studentProfile._id,
    })
      .sort({ createdAt: -1 })
      .select("riskLevel createdAt")
      .lean();

    const latestCommerceRiskLevel = latestCommerceRisk?.riskLevel
      ? String(latestCommerceRisk.riskLevel)
      : null;
    const commerceRiskAssessed = Boolean(latestCommerceRiskLevel);
    const shortRisk = latestCommerceRiskLevel
      ? latestCommerceRiskLevel.replace(/ Risk$/i, "")
      : null;
    const riskStatus =
      commerceRiskAssessed && ["High", "Medium", "Low"].includes(shortRisk)
        ? shortRisk
        : null;

    res.status(200).json({
      student: studentProfile,
      latestResult: academic.latestResult,
      results: academic.results,
      performanceResults: academic.performanceResults,
      subjectPerformance: academic.subjectPerformance,
      attendancePercentage: studentProfile.attendancePercentage,
      currentZScore: academic.currentZScore,
      riskStatus,
      commerceRiskAssessed,
      latestCommerceRiskLevel,
      attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
