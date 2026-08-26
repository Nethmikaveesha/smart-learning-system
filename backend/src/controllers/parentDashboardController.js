import StudentProfile from "../models/StudentProfile.js";
import Attendance from "../models/Attendance.js";
import CommerceRisk from "../models/CommerceRisk.js";
import {
  calculateOverallAverage,
  getSubjectName,
} from "../utils/studentResults.js";
import { linkedStudentsQuery } from "../utils/parentLinks.js";
import { buildStudentAcademicSnapshot } from "../utils/studentAcademicSnapshot.js";

async function getAttendanceSummary(studentId, attendancePercentage) {
  const records = await Attendance.find({ student: studentId });
  const presentDays = records.filter((record) => record.status === "Present").length;
  const absentDays = records.filter((record) => record.status === "Absent").length;

  let status = "No Data";
  if (attendancePercentage >= 80) status = "Satisfactory";
  else if (attendancePercentage > 0) status = "Needs Attention";

  return {
    presentDays,
    absentDays,
    attendanceRate: attendancePercentage || 0,
    status,
  };
}

function buildAlerts({ results, attendancePercentage, riskStatus, commerceRiskAssessed }) {
  const alerts = [];

  const weakSubjects = results.filter((result) => Number(result.marks) < 50);

  weakSubjects.forEach((result) => {
    alerts.push(
      `${getSubjectName(result)} marks are below the target level.`
    );
  });

  if (attendancePercentage >= 80) {
    alerts.push("Attendance is currently satisfactory.");
  } else if (attendancePercentage > 0) {
    alerts.push("Attendance requires attention.");
  }

  if (results.length > 0) {
    alerts.push("New term test results have been published.");
  }

  if (
    commerceRiskAssessed &&
    (riskStatus === "High" || riskStatus === "Medium")
  ) {
    alerts.push(`Risk status is currently ${riskStatus}.`);
  }

  return [...new Set(alerts)];
}

function buildRecommendedAction(results) {
  const weakResult = results.find((result) => Number(result.marks) < 50);

  if (!weakResult) {
    return {
      title: "Keep encouraging consistent revision",
      message: "Your child is maintaining steady academic progress.",
      topics: [],
    };
  }

  const subject = getSubjectName(weakResult);

  return {
    title: `${subject} requires additional attention.`,
    message: "Encourage the student to revise the following areas:",
    topics: ["Demand and Supply", "Market Structures"],
  };
}

async function getLinkedStudents(parentId) {
  return StudentProfile.find(linkedStudentsQuery(parentId))
    .populate("user", "fullName email")
    .populate("class", "className")
    .populate("subjects", "subjectName subjectCode")
    .sort({ studentId: 1 });
}

async function resolveStudentProfile(parentId, studentId) {
  const query = linkedStudentsQuery(parentId);

  if (studentId) {
    query.studentId = studentId;
  }

  return StudentProfile.findOne(query)
    .populate("user", "fullName email")
    .populate("class", "className")
    .populate("subjects", "subjectName subjectCode");
}

export const getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user._id;
    const requestedStudentId = req.query.studentId;

    const linkedChildren = await getLinkedStudents(parentId);

    if (linkedChildren.length === 0) {
      return res.status(404).json({
        message: "No student linked to this parent",
      });
    }

    const studentProfile = requestedStudentId
      ? linkedChildren.find((child) => child.studentId === requestedStudentId)
      : linkedChildren[0];

    if (!studentProfile) {
      return res.status(404).json({
        message: "Selected child is not linked to this parent",
      });
    }

    const academic = await buildStudentAcademicSnapshot(studentProfile);
    const results = academic.results;

    const attendanceRecords = await Attendance.find({
      student: studentProfile._id,
    })
      .populate({
        path: "student",
        select: "studentId",
        populate: {
          path: "user",
          select: "fullName",
        },
      })
      .populate("class", "className")
      .sort({ date: -1 });

    // Parent-facing rows: never expose MongoDB ObjectIds in the UI.
    const attendanceRows = attendanceRecords.map((record) => ({
      date: record.date,
      status: record.status,
      student:
        record.student?.user?.fullName ||
        studentProfile.user?.fullName ||
        "Student",
      studentCode: record.student?.studentId || studentProfile.studentId || "",
      className: record.class?.className || studentProfile.class?.className || "",
    }));

    const monthlyMap = {};

    results.forEach((result) => {
      const dateValue = result.exam?.examDate || result.createdAt;
      if (!dateValue) return;

      const date = new Date(dateValue);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          totalMarks: 0,
          count: 0,
        };
      }

      monthlyMap[monthKey].totalMarks += Number(result.marks) || 0;
      monthlyMap[monthKey].count += 1;
    });

    const monthlyPerformance = Object.values(monthlyMap)
      .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
      .map((item) => {
        const [year, month] = item.monthKey.split("-");
        const labelDate = new Date(Number(year), Number(month) - 1, 1);

        return {
          month: labelDate.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          }),
          averageMarks: Number((item.totalMarks / item.count).toFixed(2)),
          resultCount: item.count,
        };
      });

    const attendanceSummary = await getAttendanceSummary(
      studentProfile._id,
      studentProfile.attendancePercentage
    );

    const overallAverage = calculateOverallAverage(results);

    // Profile riskStatus defaults to "Low" — only CommerceRisk counts as assessed.
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
      linkedChildren: linkedChildren.map((child) => ({
        studentId: child.studentId,
        fullName: child.user?.fullName,
        className: child.class?.className,
      })),
      selectedStudentId: studentProfile.studentId,
      student: studentProfile,
      latestResult: academic.latestResult,
      results,
      performanceResults: academic.performanceResults,
      monthlyPerformance,
      subjectPerformance: academic.subjectPerformance,
      overallAverage,
      attendancePercentage: studentProfile.attendancePercentage,
      currentZScore: academic.currentZScore,
      riskStatus,
      commerceRiskAssessed,
      latestCommerceRiskLevel,
      attendanceRecords: attendanceRows,
      attendanceSummary,
      alerts: buildAlerts({
        results,
        attendancePercentage: studentProfile.attendancePercentage,
        riskStatus,
        commerceRiskAssessed,
      }),
      recommendedAction: buildRecommendedAction(results),
    });
  } catch (error) {
    console.error("Parent Dashboard Error:", error.message);

    res.status(500).json({
      message: error.message,
    });
  }
};
