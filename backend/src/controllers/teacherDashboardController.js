import StudentProfile from "../models/StudentProfile.js";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";

export const getTeacherDashboard = async (req, res) => {
  try {
    const totalStudents = await StudentProfile.countDocuments();
    const totalExams = await Exam.countDocuments();
    const totalResults = await Result.countDocuments();

    const results = await Result.find();

    const averageMarks =
      results.length > 0
        ? (
            results.reduce((sum, item) => sum + item.marks, 0) /
            results.length
          ).toFixed(2)
        : 0;

    const passCount = results.filter((item) => item.marks >= 35).length;
    const failCount = results.filter((item) => item.marks < 35).length;

    const highRiskStudents = await StudentProfile.countDocuments({
      riskStatus: "High",
    });

    const recentResults = await Result.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .populate("exam", "examName examDate")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalStudents,
      totalExams,
      totalResults,
      averageMarks,
      passCount,
      failCount,
      highRiskStudents,
      recentResults,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};