import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";
import {
  calculateOverallAverage,
  dedupeResults,
  getSubjectName,
  sortResultsByLatest,
} from "../utils/studentResults.js";

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

function buildAlerts({ results, attendancePercentage, riskStatus }) {
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

  if (riskStatus === "High" || riskStatus === "Medium") {
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
  return StudentProfile.find({ parent: parentId })
    .populate("user", "fullName email")
    .populate("class", "className")
    .populate("subjects", "subjectName subjectCode")
    .sort({ studentId: 1 });
}

async function resolveStudentProfile(parentId, studentId) {
  const query = { parent: parentId };

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

    const rawResults = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      select: "examName examDate",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const results = sortResultsByLatest(dedupeResults(rawResults));

    const attendanceRecords = await Attendance.find({
      student: studentProfile._id,
    }).sort({ date: -1 });

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

    const subjectPerformance = studentProfile.subjects
      .map((subject) => {
        const subjectResult = results.find(
          (result) =>
            result.exam?.subject?._id?.toString() === subject._id.toString() ||
            result.exam?.subject?.toString() === subject._id.toString()
        );

        return {
          subject: subject.subjectName,
          marks: subjectResult ? subjectResult.marks : null,
        };
      })
      .filter((item) => item.marks !== null);

    const attendanceSummary = await getAttendanceSummary(
      studentProfile._id,
      studentProfile.attendancePercentage
    );

    const overallAverage = calculateOverallAverage(results);

    res.status(200).json({
      linkedChildren: linkedChildren.map((child) => ({
        studentId: child.studentId,
        fullName: child.user?.fullName,
        className: child.class?.className,
      })),
      selectedStudentId: studentProfile.studentId,
      student: studentProfile,
      latestResult: results[0] || null,
      results,
      monthlyPerformance,
      subjectPerformance,
      overallAverage,
      attendancePercentage: studentProfile.attendancePercentage,
      riskStatus: studentProfile.riskStatus,
      attendanceRecords,
      attendanceSummary,
      alerts: buildAlerts({
        results,
        attendancePercentage: studentProfile.attendancePercentage,
        riskStatus: studentProfile.riskStatus,
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
