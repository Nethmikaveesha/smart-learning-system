import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import ContentRecommendation from "../models/ContentRecommendation.js";
import Flashcard from "../models/Flashcard.js";

export const getAdaptiveLearningPlan = async (req, res) => {
  try {
    const student = await StudentProfile.findOne({
      user: req.user._id,
    }).populate("subjects");

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const results = await Result.find({
      student: student._id,
    }).populate({
      path: "exam",
      populate: {
        path: "subject",
        select: "subjectName",
      },
    });

    const recommendations = [];

    for (const result of results) {
      if (result.marks < 50) {
        const subject = result.exam?.subject;

        const notes = await ContentRecommendation.find({
          subject: subject?._id,
        });

        const flashcards = await Flashcard.find({
          subject: subject?._id,
        });

        recommendations.push({
          subject: subject?.subjectName,
          marks: result.marks,
          recommendation:
            "Additional revision is recommended for this subject.",
          notes,
          flashcards,
        });
      }
    }

    res.status(200).json({
      studentId: student.studentId,
      adaptivePlan: recommendations,
      hasExamResults: results.length > 0,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};