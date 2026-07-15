import StudentProfile from "../models/StudentProfile.js";
import Result from "../models/Result.js";
import Exam from "../models/Exam.js";

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

export const generateRevisionTimetable = async (req, res) => {
  try {
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    })
      .populate("subjects", "subjectName")
      .populate("class", "className");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    if (!studentProfile.class) {
      return res.status(200).json({
        message: "No class assigned to this student profile",
        studentId: studentProfile.studentId,
        timetable: [],
      });
    }

    const today = new Date();

    const upcomingExams = await Exam.find({
      class: studentProfile.class._id,
      examDate: { $gte: today },
    })
      .populate("subject", "subjectName")
      .sort({ examDate: 1 });

    if (upcomingExams.length === 0) {
      return res.status(200).json({
        message: "No upcoming exams found",
        studentId: studentProfile.studentId,
        timetable: [],
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

    const timetable = upcomingExams.map((exam) => {
      const subjectResults = results.filter(
        (result) =>
          result.exam?.subject?._id?.toString() ===
          exam.subject?._id?.toString()
      );

      const averageMarks =
        subjectResults.length > 0
          ? subjectResults.reduce((sum, r) => sum + r.marks, 0) /
            subjectResults.length
          : 0;

      const examDate = new Date(exam.examDate);
      const daysRemaining = Math.max(
        1,
        Math.ceil((examDate - today) / (1000 * 60 * 60 * 24))
      );

      let priority = "Low";
      let dailyStudyHours = 1;

      if (averageMarks < 35) {
        priority = "High";
        dailyStudyHours = 3;
      } else if (averageMarks < 65) {
        priority = "Medium";
        dailyStudyHours = 2;
      }

      if (daysRemaining <= 7) {
        dailyStudyHours += 1;
      }

      return {
        examName: exam.examName,
        subject: exam.subject?.subjectName,
        examDate: exam.examDate,
        daysRemaining,
        averageMarks: Number(averageMarks.toFixed(2)),
        priority,
        dailyStudyHours,
        recommendation:
          priority === "High"
            ? "Revise this subject daily and focus on weak areas."
            : priority === "Medium"
            ? "Revise this subject regularly and practise past questions."
            : "Maintain revision with short daily sessions.",
      };
    });

    res.status(200).json({
      message: "Revision timetable generated successfully",
      studentId: studentProfile.studentId,
      className: studentProfile.class?.className,
      timetable,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};