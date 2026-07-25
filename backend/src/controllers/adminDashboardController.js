import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Subject from "../models/Subject.js";
import Exam from "../models/Exam.js";
import { isPassingMark, getPassMark } from "../utils/grading.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudentProfiles = await StudentProfile.countDocuments();
    const totalStudentAccounts = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalParents = await User.countDocuments({ role: "parent" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalSubjects = await Subject.countDocuments();
    const totalExams = await Exam.countDocuments();
    const passMark = await getPassMark();

    const results = await Result.find().populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const totalResults = results.length;

    const passCount = results.filter((result) =>
      isPassingMark(result.marks, passMark)
    ).length;
    const failCount = results.filter(
      (result) => !isPassingMark(result.marks, passMark)
    ).length;

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

      if (!isPassingMark(result.marks, passMark)) {
        subjectStats[subjectName].failCount += 1;
      }
    });

    const subjects = await Subject.find().select("subjectName");

    const subjectDifficulty = subjects.map((subject) => {
      const stats = subjectStats[subject.subjectName];

      if (!stats) {
        return {
          subject: subject.subjectName,
          averageMarks: 0,
          failCount: 0,
          resultCount: 0,
        };
      }

      return {
        subject: stats.subject,
        averageMarks: Number((stats.totalMarks / stats.count).toFixed(2)),
        failCount: stats.failCount,
        resultCount: stats.count,
      };
    });

    res.status(200).json({
      totalUsers,
      totalStudents: totalStudentProfiles,
      totalStudentAccounts,
      totalTeachers: totalTeachers || 0,
      totalParents: totalParents || 0,
      totalAdmins: totalAdmins || 0,
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
