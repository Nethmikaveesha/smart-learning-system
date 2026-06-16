import EssayQuestion from "../models/EssayQuestion.js";
import MarkingScheme from "../models/MarkingScheme.js";
import EssaySubmission from "../models/EssaySubmission.js";

export const createEssayQuestion = async (req, res) => {
  try {
    const { subject, question, maxMarks } = req.body;

    const essayQuestion = await EssayQuestion.create({
      subject,
      question,
      maxMarks,
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
      if (
        answer.toLowerCase().includes(keyword.toLowerCase())
      ) {
        score++;
      }
    });

    const marks = Math.round(
      (score / markingScheme.keywords.length) * 10
    );

    const feedback =
      marks >= 8
        ? "Excellent answer"
        : marks >= 5
        ? "Good answer, but needs improvement"
        : "Weak answer. Add more key points.";

    const submission = await EssaySubmission.create({
      student: studentId,
      question: questionId,
      answer,
      marks,
      feedback,
    });

    res.status(201).json({
      message: "Essay graded successfully",
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