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

    res.status(200).json({
      student: studentProfile,
      latestResult: results[0] || null,
      results,
      attendancePercentage: studentProfile.attendancePercentage,
      riskStatus: studentProfile.riskStatus,
      attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};