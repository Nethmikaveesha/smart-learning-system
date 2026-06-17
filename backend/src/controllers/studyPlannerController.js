import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";

export const generateStudyPlan = async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    }).populate("subjects", "subjectName");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const results = await Result.find({
      student: studentProfile._id,
    }).populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const subjectPlans = studentProfile.subjects.map((subject) => {
      const subjectResults = results.filter(
  (result) =>
    result.exam?.subject?._id?.toString() === subject._id.toString()
);

      const averageMarks =
        subjectResults.length > 0
          ? subjectResults.reduce((sum, r) => sum + r.marks, 0) /
            subjectResults.length
          : 0;

      let recommendedHours = 1;
      let priority = "Low";

      if (averageMarks < 35) {
        recommendedHours = 3;
        priority = "High";
      } else if (averageMarks < 65) {
        recommendedHours = 2;
        priority = "Medium";
      }

      return {
        subject: subject.subjectName,
        averageMarks: Number(averageMarks.toFixed(2)),
        recommendedHours,
        priority,
      };
    });

    res.status(200).json({
      message: "Study plan generated successfully",
      studentId: studentProfile.studentId,
      plan: subjectPlans,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};