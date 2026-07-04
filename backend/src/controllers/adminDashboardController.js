import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await StudentProfile.countDocuments();
    const totalSubjects = await Subject.countDocuments();
    const totalExams = await Exam.countDocuments();

    const results = await Result.find().populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const totalResults = results.length;

    const passCount = results.filter((r) => r.marks >= 35).length;
    const failCount = results.filter((r) => r.marks < 35).length;

    const passPercentage =
      totalResults > 0
        ? Number(((passCount / totalResults) * 100).toFixed(2))
        : 0;

    const subjectStats = {};

    results.forEach((result) => {
      const subjectName =
        result.exam?.subject?.subjectName || "Unknown Subject";

      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = {
          subject: subjectName,
          totalMarks: 0,
          count: 0,
          failCount: 0,
        };
      }

      subjectStats[subjectName].totalMarks += result.marks;
      subjectStats[subjectName].count += 1;

      if (result.marks < 35) {
        subjectStats[subjectName].failCount += 1;
      }
    });

    const subjectDifficulty = Object.values(subjectStats).map((item) => ({
      subject: item.subject,
      averageMarks: Number((item.totalMarks / item.count).toFixed(2)),
      failCount: item.failCount,
    }));

    res.status(200).json({
      totalUsers,
      totalStudents,
      totalSubjects,
      totalExams,
      totalResults,
      passCount,
      failCount,
      passPercentage,
      subjectDifficulty,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};