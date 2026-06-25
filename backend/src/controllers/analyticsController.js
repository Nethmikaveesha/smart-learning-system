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

export const attendanceGradesCorrelation = async (req, res) => {
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

      let grade = "N/A";

      if (averageMarks >= 75) grade = "A";
      else if (averageMarks >= 65) grade = "B";
      else if (averageMarks >= 55) grade = "C";
      else if (averageMarks >= 35) grade = "S";
      else if (averageMarks > 0) grade = "F";

      chartData.push({
        studentId: student.studentId,
        attendance: student.attendancePercentage,
        averageMarks: Number(averageMarks.toFixed(2)),
        grade,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};