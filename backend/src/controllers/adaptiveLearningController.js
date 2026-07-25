import Result from "../models/Result.js";
import StudentProfile from "../models/StudentProfile.js";
import ContentRecommendation from "../models/ContentRecommendation.js";
import Flashcard from "../models/Flashcard.js";
import EssaySubmission from "../models/EssaySubmission.js";
import AdaptiveStudyMaterial from "../models/AdaptiveStudyMaterial.js";
import { generateAdaptiveMaterialFromErrorsWithGemini } from "../services/geminiService.js";
import { createAuditLog } from "../utils/createAuditLog.js";

const isWeakSubmission = (submission) => {
  const maxMarks = Number(
    submission.question?.maxMarks ||
      submission.markBreakdown?.maxMarks ||
      10
  );
  const marks = Number(
    submission.finalMarks ?? submission.marks ?? 0
  );
  const scoreRatio = maxMarks > 0 ? marks / maxMarks : 0;
  const hasGaps =
    (submission.topicAnalysis?.weakTopics || []).length > 0 ||
    (submission.topicAnalysis?.missingConcepts || []).length > 0 ||
    (submission.nlpEvaluation?.missingKeywords || []).length > 0;

  return scoreRatio < 0.5 || hasGaps;
};

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
        }).limit(5);

        const flashcards = await Flashcard.find({
          subject: subject?._id,
        }).limit(8);

        recommendations.push({
          subject: subject?.subjectName,
          subjectId: subject?._id,
          marks: result.marks,
          recommendation:
            "Additional revision is recommended for this subject.",
          notes,
          flashcards,
        });
      }
    }

    const weakSubmissions = await EssaySubmission.find({
      student: student._id,
    })
      .populate({
        path: "question",
        select: "question maxMarks subject",
        populate: { path: "subject", select: "subjectName" },
      })
      .sort({ createdAt: -1 })
      .limit(20);

    const incorrectAttempts = weakSubmissions
      .filter(isWeakSubmission)
      .map((submission) => ({
        submissionId: submission._id,
        question: submission.question?.question,
        subject: submission.question?.subject?.subjectName,
        subjectId: submission.question?.subject?._id,
        marks: submission.finalMarks ?? submission.marks,
        maxMarks: submission.question?.maxMarks || 10,
        weakTopics: submission.topicAnalysis?.weakTopics || [],
        missingConcepts: submission.topicAnalysis?.missingConcepts || [],
        feedback: submission.teacherFeedback || submission.feedback || "",
      }));

    const generatedMaterials = await AdaptiveStudyMaterial.find({
      student: student._id,
    })
      .populate("subject", "subjectName")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      studentId: student.studentId,
      adaptivePlan: recommendations,
      hasExamResults: results.length > 0,
      incorrectAttempts,
      generatedMaterials,
      canGenerate: incorrectAttempts.length > 0,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Analyse weak/incorrect essay answers and create Gemini study materials.
 */
export const generateAdaptiveMaterials = async (req, res) => {
  try {
    const student = await StudentProfile.findOne({
      user: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const limit = Math.min(Number(req.body?.limit) || 3, 5);

    const submissions = await EssaySubmission.find({
      student: student._id,
    })
      .populate({
        path: "question",
        select: "question maxMarks subject",
        populate: { path: "subject", select: "subjectName" },
      })
      .sort({ createdAt: -1 })
      .limit(30);

    const weakOnes = submissions.filter(isWeakSubmission).slice(0, limit);

    if (!weakOnes.length) {
      return res.status(400).json({
        message:
          "No weak or incorrect essay attempts found yet. Submit essay answers first.",
      });
    }

    const created = [];

    for (const submission of weakOnes) {
      const existing = await AdaptiveStudyMaterial.findOne({
        student: student._id,
        sourceSubmission: submission._id,
      });

      if (existing) {
        created.push(existing);
        continue;
      }

      const generated = await generateAdaptiveMaterialFromErrorsWithGemini({
        subjectName: submission.question?.subject?.subjectName,
        question: submission.question?.question,
        studentAnswer: submission.answer,
        weakTopics: submission.topicAnalysis?.weakTopics || [],
        missingConcepts: [
          ...(submission.topicAnalysis?.missingConcepts || []),
          ...(submission.nlpEvaluation?.missingKeywords || []),
        ],
        feedback: submission.teacherFeedback || submission.feedback || "",
      });

      const material = await AdaptiveStudyMaterial.create({
        student: student._id,
        subject: submission.question?.subject?._id,
        sourceSubmission: submission._id,
        topic: generated.topic,
        noteTitle: generated.noteTitle,
        noteDescription: generated.noteDescription,
        practiceTips: generated.practiceTips,
        weakTopics: submission.topicAnalysis?.weakTopics || [],
        missingConcepts: submission.topicAnalysis?.missingConcepts || [],
        difficultyLevel: generated.difficultyLevel || "Medium",
        generatedBy: generated.generatedBy,
      });

      created.push(material);
    }

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Adaptive Learning",
      description: `Generated ${created.length} adaptive study material(s) from incorrect answers`,
    });

    const materials = await AdaptiveStudyMaterial.find({
      _id: { $in: created.map((item) => item._id) },
    }).populate("subject", "subjectName");

    res.status(200).json({
      message: "Adaptive study materials generated from your incorrect answers",
      count: materials.length,
      materials,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
