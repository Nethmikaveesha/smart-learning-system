import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";

export const getStudentBadges = async (req, res) => {
  try {
    const student = await StudentProfile.findOne({
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const results = await Result.find({
      student: student._id,
    });

    const badges = [];

    const averageMarks =
      results.length > 0
        ? results.reduce((sum, result) => sum + result.marks, 0) /
          results.length
        : 0;

    if (student.attendancePercentage >= 90) {
      badges.push({
        title: "Attendance Champion",
        description: "Maintained attendance above 90%.",
        icon: "🏆",
      });
    }

    if (averageMarks >= 75) {
      badges.push({
        title: "Top Performer",
        description: "Achieved an average mark above 75.",
        icon: "⭐",
      });
    }

    if (results.length >= 3) {
      badges.push({
        title: "Consistent Learner",
        description: "Completed three or more assessments.",
        icon: "📘",
      });
    }

    if (student.riskStatus === "Low") {
      badges.push({
        title: "Safe Progress",
        description: "Currently maintaining low academic risk.",
        icon: "✅",
      });
    }

    res.status(200).json({
      studentId: student.studentId,
      averageMarks: Number(averageMarks.toFixed(2)),
      badges,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};