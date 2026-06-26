import EssayQuestion from "../models/EssayQuestion.js";
import MarkingScheme from "../models/MarkingScheme.js";
import EssaySubmission from "../models/EssaySubmission.js";
import {
  evaluateEssayWithGemini,
  analyzeEssayTopicsWithGemini,
} from "../services/geminiService.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const createEssayQuestion = async (req, res) => {
  try {
    const { subject, question, maxMarks } = req.body;

    const essayQuestion = await EssayQuestion.create({
      subject,
      question,
      maxMarks,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Essay Question",
      description: "New essay question created",
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
        message: "Marking scheme not found",
      });
    }

    let score = 0;

    markingScheme.keywords.forEach((keyword) => {
      if (answer.toLowerCase().includes(keyword.toLowerCase())) {
        score++;
      }
    });

    const keywordMarks = Math.round(
      (score / markingScheme.keywords.length) * essayQuestion.maxMarks
    );

    const keywordFeedback =
      keywordMarks >= 8
        ? "Excellent answer"
        : keywordMarks >= 5
        ? "Good answer, but needs improvement"
        : "Weak answer. Add more key points.";

    const geminiEvaluation = await evaluateEssayWithGemini(
      essayQuestion.question,
      answer,
      essayQuestion.maxMarks
    );

    const topicAnalysis = await analyzeEssayTopicsWithGemini(
      essayQuestion.question,
      answer,
      markingScheme.modelAnswer
    );

    const finalAiMarks =
      geminiEvaluation.marks && geminiEvaluation.marks > 0
        ? geminiEvaluation.marks
        : keywordMarks;

    const finalAiFeedback =
      geminiEvaluation.feedback &&
      geminiEvaluation.feedback !==
        "Gemini evaluation failed. Please use teacher review."
        ? geminiEvaluation.feedback
        : keywordFeedback;

    const submission = await EssaySubmission.create({
      student: studentId,
      question: questionId,
      answer,
      marks: finalAiMarks,
      feedback: finalAiFeedback,
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
        totalKeywords: markingScheme.keywords.length,
      },
      geminiEvaluation,
      topicAnalysis,
      submission,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const approveEssaySubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { finalMarks, teacherFeedback } = req.body;

    const submission = await EssaySubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        message: "Essay submission not found",
      });
    }

    submission.finalMarks = finalMarks;
    submission.teacherFeedback = teacherFeedback;
    submission.status =
      finalMarks === submission.marks ? "Approved" : "Modified";

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
      .populate("question", "question maxMarks")
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
    const questions = await EssayQuestion.find().populate(
      "subject",
      "subjectName"
    );

    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};