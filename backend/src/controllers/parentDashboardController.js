import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";

export const getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user._id;

    const studentProfile = await StudentProfile.findOne({
      parent: parentId,
    })
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName");

    if (!studentProfile) {
      return res.status(404).json({
        message: "No student linked to this parent",
      });
    }

    const results = await Result.find({
      student: studentProfile._id,
    })
      .populate("exam", "examName examDate")
      .sort({ createdAt: -1 });

    const attendanceRecords = await Attendance.find({
      student: studentProfile._id,
    }).sort({ date: -1 });

    // =====================================================
    // TRUE MONTHLY PERFORMANCE ANALYSIS
    // =====================================================

    const monthlyMap = {};

    results.forEach((result) => {
      const dateValue =
        result.exam?.examDate || result.createdAt;

      if (!dateValue) return;

      const date = new Date(dateValue);

      // Stable key for correct chronological sorting
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
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((item) => {
        const [year, month] = item.monthKey.split("-");

        const labelDate = new Date(
          Number(year),
          Number(month) - 1,
          1
        );

        return {
          month: labelDate.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          }),
          averageMarks: Number(
            (item.totalMarks / item.count).toFixed(2)
          ),
          resultCount: item.count,
        };
      });

    res.status(200).json({
      student: studentProfile,
      latestResult: results[0] || null,
      results,

      // Important for Monthly Performance Line Graph
      monthlyPerformance,

      attendancePercentage:
        studentProfile.attendancePercentage,

      riskStatus: studentProfile.riskStatus,

      attendanceRecords,
    });
  } catch (error) {
    console.error(
      "Parent Dashboard Error:",
      error.message
    );

    res.status(500).json({
      message: error.message,
    });
  }
};