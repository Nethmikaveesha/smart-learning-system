import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Attendance from "../models/Attendance.js";

export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const studentProfile = await StudentProfile.findOne({
      user: userId,
    })
      .populate("user", "fullName email")
      .populate("class", "className")
      .populate("subjects", "subjectName");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
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
      currentZScore: studentProfile.currentZScore,
      riskStatus: studentProfile.riskStatus,
      attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};