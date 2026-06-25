import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";

export const attendanceMarksCorrelation = async (req, res) => {
  try {
    const students = await StudentProfile.find();

    const chartData = [];

    for (const student of students) {
      const results = await Result.find({
        student: student._id,
      });

      let averageMarks = 0;

      if (results.length > 0) {
        averageMarks =
          results.reduce((sum, item) => sum + item.marks, 0) /
          results.length;
      }

      chartData.push({
        studentId: student.studentId,
        attendance: student.attendancePercentage,
        averageMarks: Number(averageMarks.toFixed(2)),
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};