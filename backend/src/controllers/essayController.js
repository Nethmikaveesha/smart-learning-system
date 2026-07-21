import EssayQuestion from "../models/EssayQuestion.js";
import MarkingScheme from "../models/MarkingScheme.js";
import EssaySubmission from "../models/EssaySubmission.js";
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

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

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

export const submitEssay = async (req, res) => {
  try {
    const { studentId, questionId, answer } = req.body;

    if (!studentId || !questionId || !answer?.trim()) {
      return res.status(400).json({
        message: "studentId, questionId, and answer are required",
      });
    }

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

    submission.finalMarks = resolvedFinalMarks;
    submission.teacherFeedback = teacherFeedback || submission.teacherFeedback;
    submission.status =
      Number(resolvedFinalMarks) === Number(submission.marks)
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
    const submissions = await EssaySubmission.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "fullName email",
        },
      })
      .populate("question", "question maxMarks gradeLevel")
      .sort({ createdAt: -1 });

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

    const questions = await EssayQuestion.find(filter)
      .populate("subject", "subjectName subjectCode")
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