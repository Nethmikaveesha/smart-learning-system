import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import CommerceRisk from "../models/CommerceRisk.js";
import {
  dedupeResults,
  sortResultsByLatest,
} from "../utils/studentResults.js";
import { buildSubjectPerformance } from "../utils/subjectPerformance.js";
import { resolveCommerceSubjectMarks } from "../utils/commerceMarks.js";
import { healExamAnalytics } from "../utils/examAnalytics.js";

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

    let rawResults = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      select: "examName examDate",
      populate: {
        path: "subject",
        select: "subjectName subjectCode",
      },
    });

    // Heal stale Z-scores (e.g. lone 0.00 on single-student exams).
    await healExamAnalytics(
      rawResults.map((result) => result.exam?._id || result.exam)
    );

    rawResults = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      select: "examName examDate",
      populate: {
        path: "subject",
        select: "subjectName subjectCode",
      },
    });

    const results = sortResultsByLatest(dedupeResults(rawResults));
    let subjectPerformance = buildSubjectPerformance(
      studentProfile.subjects,
      results
    );

    // Fill missing Commerce subjects from essay scores so Risk Assessment
    // cards match work already done in Submit Answers / Adaptive Learning.
    const hasAllCommerce = ["account", "business", "economic"].every((keyword) =>
      subjectPerformance.some((item) =>
        String(item.subject || "")
          .toLowerCase()
          .includes(keyword)
      )
    );

    if (!hasAllCommerce) {
      const commerceMarks = await resolveCommerceSubjectMarks(
        studentProfile._id
      );
      const byName = new Map(
        subjectPerformance.map((item) => [
          String(item.subject || "").toLowerCase(),
          item,
        ])
      );

      for (const item of commerceMarks.performance) {
        const key = String(item.subject || "").toLowerCase();
        if (!byName.has(key)) {
          byName.set(key, {
            subject: item.subject,
            marks: item.marks,
            source: item.source,
          });
        }
      }

      subjectPerformance = Array.from(byName.values());
    }

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
      latestResult: results[0] || null,
      results,
      subjectPerformance,
      attendancePercentage: studentProfile.attendancePercentage,
      currentZScore: studentProfile.currentZScore,
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
