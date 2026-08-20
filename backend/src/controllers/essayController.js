import EssayQuestion from "../models/EssayQuestion.js";
import MarkingScheme from "../models/MarkingScheme.js";
import EssaySubmission from "../models/EssaySubmission.js";
import Subject from "../models/Subject.js";
import {
  evaluateEssayWithGemini,
  analyzeEssayTopicsWithGemini,
} from "../services/geminiService.js";
import { evaluateEssayWithNlp } from "../services/nlpService.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import {
  applyTeacherPartMarks,
  buildMarkBreakdown,
} from "../utils/essayMarkBreakdown.js";
import StudentProfile from "../models/StudentProfile.js";

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

async function getTeacherPaperFilter(teacherId) {
  const mySubjectIds = await Subject.find({
    assignedTeacher: teacherId,
  }).distinct("_id");

  return {
    $or: [
      { createdBy: teacherId },
      {
        subject: { $in: mySubjectIds },
        $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
      },
    ],
  };
}

export const createEssayQuestion = async (req, res) => {
  try {
    const { subject, question, maxMarks, gradeLevel } = req.body;
    const resolvedGradeLevel = Number(gradeLevel);

    if (![12, 13].includes(resolvedGradeLevel)) {
      return res.status(400).json({
        message: "gradeLevel is required and must be 12 or 13",
      });
    }

    if (!subject || !question) {
      return res.status(400).json({
        message: "subject and question are required",
      });
    }

    const essayQuestion = await EssayQuestion.create({
      subject,
      question,
      maxMarks,
      gradeLevel: resolvedGradeLevel,
      createdBy: req.user?._id,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Essay Question",
      description: `New essay question created for Grade ${resolvedGradeLevel}`,
    });

    res.status(201).json({
      message: "Essay question created successfully",
      essayQuestion,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMarkingScheme = async (req, res) => {
  try {
    const { question, keywords, modelAnswer } = req.body;

    if (!question || !modelAnswer?.trim()) {
      return res.status(400).json({
        message: "question and modelAnswer are required",
      });
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        message: "keywords must be a non-empty array",
      });
    }

    const markingScheme = await MarkingScheme.create({
      question,
      keywords,
      modelAnswer,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Marking Scheme",
      description: "New essay marking scheme created",
    });

    res.status(201).json({
      message: "Marking scheme created successfully",
      markingScheme,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMarkingSchemes = async (req, res) => {
  try {
    let schemes = await MarkingScheme.find()
      .populate("question", "question maxMarks subject gradeLevel createdBy")
      .sort({ createdAt: -1 });

    if (req.user?.role === "teacher") {
      const paperFilter = await getTeacherPaperFilter(req.user._id);
      const myQuestionIds = new Set(
        (
          await EssayQuestion.find(paperFilter).select("_id")
        ).map((item) => item._id.toString())
      );

      schemes = schemes.filter((scheme) => {
        const questionId =
          scheme.question?._id?.toString() || scheme.question?.toString();
        return questionId && myQuestionIds.has(questionId);
      });
    }

    res.status(200).json(schemes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitEssay = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || !answer?.trim()) {
      return res.status(400).json({
        message: "questionId and answer are required",
      });
    }

    // Always bind submission to the logged-in student's own profile (no IDOR).
    const studentProfile = await StudentProfile.findOne({
      user: req.user._id,
    }).select("_id");

    if (!studentProfile) {
      return res.status(404).json({
        message: "Student profile not found for the logged-in user",
      });
    }

    const studentId = studentProfile._id;

    const essayQuestion = await EssayQuestion.findById(questionId);

    if (!essayQuestion) {
      return res.status(404).json({
        message: "Essay question not found",
      });
    }

    const markingScheme = await MarkingScheme.findOne({
      question: questionId,
    });

    if (!markingScheme) {
      return res.status(404).json({
        message:
          "Marking scheme not found for this paper. Ask your teacher to create a marking scheme first (Keywords + Model Answer).",
      });
    }

    const keywords = Array.isArray(markingScheme.keywords)
      ? markingScheme.keywords
      : [];

    let score = 0;

    keywords.forEach((keyword) => {
      if (answer.toLowerCase().includes(String(keyword).toLowerCase())) {
        score++;
      }
    });

    const keywordMarks = keywords.length
      ? Math.round((score / keywords.length) * essayQuestion.maxMarks)
      : 0;

    const keywordFeedback =
      keywordMarks >= essayQuestion.maxMarks * 0.8
        ? "Excellent answer"
        : keywordMarks >= essayQuestion.maxMarks * 0.5
        ? "Good answer, but needs improvement"
        : "Weak answer. Add more key points.";

    // NLP runs locally and must never block the student submit.
    const nlpEvaluation = evaluateEssayWithNlp({
      answer,
      modelAnswer: markingScheme.modelAnswer || "",
      keywords,
      maxMarks: essayQuestion.maxMarks,
    });

    const geminiFallback = {
      marks: 0,
      feedback: "Gemini evaluation unavailable. NLP recommended marks were used.",
      missingPoints: [],
    };

    const topicFallback = {
      weakTopics: [],
      missingConcepts: nlpEvaluation.missingKeywords || [],
      strongAreas: nlpEvaluation.matchedKeywords || [],
      improvementSuggestions: [
        "Improve keyword coverage and essay structure (introduction, body, conclusion).",
      ],
    };

    // Gemini is optional — timeout so the Submit button does not hang forever.
    const [geminiEvaluation, topicAnalysis] = await Promise.all([
      withTimeout(
        evaluateEssayWithGemini(
          essayQuestion.question,
          answer,
          essayQuestion.maxMarks
        ),
        12000,
        geminiFallback
      ),
      withTimeout(
        analyzeEssayTopicsWithGemini(
          essayQuestion.question,
          answer,
          markingScheme.modelAnswer || ""
        ),
        12000,
        topicFallback
      ),
    ]);

    const hasGeminiEvaluation =
      typeof geminiEvaluation.marks === "number" &&
      geminiEvaluation.feedback !==
        "Gemini evaluation failed. Please use teacher review." &&
      geminiEvaluation.feedback !== geminiFallback.feedback;

    const finalAiFeedback = hasGeminiEvaluation
      ? `${geminiEvaluation.feedback} NLP insight: ${nlpEvaluation.feedback}`
      : nlpEvaluation.feedback || keywordFeedback;

    const markBreakdown = buildMarkBreakdown({
      maxMarks: essayQuestion.maxMarks,
      keywordCoverage: nlpEvaluation.keywordCoverage,
      structureAnalysis: nlpEvaluation.structureAnalysis,
      matchedKeywords: nlpEvaluation.matchedKeywords,
      missingKeywords: nlpEvaluation.missingKeywords,
    });

    const recommendedMarks = markBreakdown.recommendedTotal;

    const submission = await EssaySubmission.create({
      student: studentId,
      question: questionId,
      answer,
      marks: recommendedMarks,
      feedback: finalAiFeedback,
      markBreakdown,
      nlpEvaluation,
      topicAnalysis,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Essay Submission",
      description: "Essay submitted, graded, and topic analysis completed",
    });

    res.status(201).json({
      message: "Essay graded successfully",
      keywordEvaluation: {
        marks: keywordMarks,
        matchedKeywords: score,
        totalKeywords: keywords.length,
      },
      geminiEvaluation,
      nlpEvaluation,
      topicAnalysis,
      markBreakdown,
      submission,
    });
  } catch (error) {
    console.error("Essay submit error:", error);
    res.status(500).json({
      message: error.message || "Essay submission failed",
    });
  }
};

export const approveEssaySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { finalMarks, teacherFeedback, markParts } = req.body;

    const submission = await EssaySubmission.findById(submissionId).populate(
      "question",
      "maxMarks question"
    );

    if (!submission) {
      return res.status(404).json({
        message: "Essay submission not found",
      });
    }

    let nextBreakdown = submission.markBreakdown;

    if (Array.isArray(markParts) && markParts.length > 0) {
      nextBreakdown = applyTeacherPartMarks(submission.markBreakdown, markParts);
      submission.markBreakdown = nextBreakdown;
    }

    const resolvedFinalMarks =
      nextBreakdown?.teacherTotal !== null &&
      nextBreakdown?.teacherTotal !== undefined
        ? nextBreakdown.teacherTotal
        : finalMarks !== undefined && finalMarks !== null && finalMarks !== ""
        ? Number(finalMarks)
        : submission.marks;

    const maxMarks = Number(submission.question?.maxMarks) || 0;
    if (Number.isNaN(Number(resolvedFinalMarks))) {
      return res.status(400).json({
        message: "finalMarks must be a valid number",
      });
    }

    // Never allow scores above the paper maximum (or below zero).
    const clampedFinalMarks = Math.min(
      maxMarks,
      Math.max(0, Number(resolvedFinalMarks))
    );

    submission.finalMarks = clampedFinalMarks;
    submission.teacherFeedback = teacherFeedback || submission.teacherFeedback;
    submission.status =
      Number(clampedFinalMarks) === Number(submission.marks)
        ? "Approved"
        : "Modified";

    await submission.save();

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Essay Review",
      description: `Essay submission reviewed by teacher. Status: ${submission.status}`,
    });

    res.status(200).json({
      message: "Essay submission reviewed successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAllEssaySubmissions = async (req, res) => {
  try {
    let submissions = await EssaySubmission.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .populate("question", "question maxMarks gradeLevel createdBy subject")
      .sort({ createdAt: -1 });

    if (req.user?.role === "teacher") {
      const paperFilter = await getTeacherPaperFilter(req.user._id);
      const myQuestionIds = new Set(
        (
          await EssayQuestion.find(paperFilter).select("_id")
        ).map((item) => item._id.toString())
      );

      submissions = submissions.filter((submission) => {
        const questionId =
          submission.question?._id?.toString() ||
          submission.question?.toString();
        return questionId && myQuestionIds.has(questionId);
      });
    }

    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getEssayQuestions = async (req, res) => {
  try {
    const filter = {};

    if (req.query.gradeLevel) {
      const grade = Number(req.query.gradeLevel);
      if (grade === 12 || grade === 13) {
        filter.gradeLevel = grade;
      }
    }

    // Teachers only see their own papers (plus legacy papers on assigned subjects).
    // Students and admins still receive the full list for learning/admin workflows.
    if (req.user?.role === "teacher") {
      Object.assign(filter, await getTeacherPaperFilter(req.user._id));
    }

    const questions = await EssayQuestion.find(filter)
      .populate("subject", "subjectName subjectCode")
      .populate("createdBy", "fullName email")
      .sort({ gradeLevel: 1, createdAt: -1 });

    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getTopicErrorAnalytics = async (req, res) => {
  try {
    const submissions = await EssaySubmission.find({
      "topicAnalysis.missingConcepts": { $exists: true },
    });

    const weakTopicCounts = {};
    const missingConceptCounts = {};
    const strongAreaCounts = {};

    submissions.forEach((submission) => {
      const analysis = submission.topicAnalysis;

      if (!analysis) return;

      analysis.weakTopics?.forEach((topic) => {
        const cleanTopic = topic.trim();

        weakTopicCounts[cleanTopic] =
          (weakTopicCounts[cleanTopic] || 0) + 1;
      });

      analysis.missingConcepts?.forEach((concept) => {
        const cleanConcept = concept.trim();

        missingConceptCounts[cleanConcept] =
          (missingConceptCounts[cleanConcept] || 0) + 1;
      });

      analysis.strongAreas?.forEach((area) => {
        const cleanArea = area.trim();

        strongAreaCounts[cleanArea] =
          (strongAreaCounts[cleanArea] || 0) + 1;
      });
    });

    const weakTopics = Object.entries(weakTopicCounts)
      .map(([topic, count]) => ({
        topic,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const missingConcepts = Object.entries(
      missingConceptCounts
    )
      .map(([concept, count]) => ({
        concept,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const strongAreas = Object.entries(strongAreaCounts)
      .map(([area, count]) => ({
        area,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      totalSubmissions: submissions.length,
      weakTopics,
      missingConcepts,
      strongAreas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate topic error analytics",
      error: error.message,
    });
  }
};