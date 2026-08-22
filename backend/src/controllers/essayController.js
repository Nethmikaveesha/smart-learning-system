import EssayQuestion from "../models/EssayQuestion.js";
import MarkingScheme from "../models/MarkingScheme.js";
import EssaySubmission from "../models/EssaySubmission.js";
import User from "../models/User.js";
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
import {
  canManagePaper,
  getOwnedPapersFilter,
  getSharedPapersFilter,
  getTeacherPaperFilter,
  isAdminRole,
  isPaperCreator,
} from "../utils/essayPaperAccess.js";

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export { getTeacherPaperFilter };

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

    if (req.user?.role === "teacher") {
      const paperFilter = await getTeacherPaperFilter(req.user._id);
      const owned = await EssayQuestion.findOne({
        _id: question,
        ...paperFilter,
      }).select("_id");

      if (!owned) {
        return res.status(403).json({
          message: "You can only create marking schemes for your own papers",
        });
      }
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
      "maxMarks question createdBy subject"
    );

    if (!submission) {
      return res.status(404).json({
        message: "Essay submission not found",
      });
    }

    if (req.user?.role === "teacher") {
      const paperFilter = await getTeacherPaperFilter(req.user._id);
      const questionId = submission.question?._id || submission.question;
      const owned = await EssayQuestion.findOne({
        _id: questionId,
        ...paperFilter,
      }).select("_id");

      if (!owned) {
        return res.status(403).json({
          message: "You can only review submissions for your own papers",
        });
      }
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
    const scope = String(req.query.scope || "mine").toLowerCase();

    if (req.query.gradeLevel) {
      const grade = Number(req.query.gradeLevel);
      if (grade === 12 || grade === 13) {
        filter.gradeLevel = grade;
      }
    }

    // Students still receive the full list for learning workflows.
    // Teachers default to My Papers only; Shared / Department are explicit scopes.
    if (req.user?.role === "teacher") {
      if (scope === "shared") {
        Object.assign(filter, getSharedPapersFilter(req.user._id));
      } else if (scope === "department") {
        // Department browse is admin-only; teachers cannot list all colleagues' papers.
        return res.status(403).json({
          message: "Department papers are available to administrators only",
        });
      } else {
        // Default + unknown scopes → mine
        Object.assign(filter, await getOwnedPapersFilter(req.user._id));
      }
    } else if (isAdminRole(req.user?.role) && scope === "department") {
      // Admin department view: all papers (optionally still grade-filtered above).
    } else if (isAdminRole(req.user?.role) && scope === "shared") {
      Object.assign(filter, { sharedWith: { $exists: true, $ne: [] } });
    } else if (isAdminRole(req.user?.role) && scope === "mine") {
      Object.assign(filter, { createdBy: req.user._id });
    }

    const questions = await EssayQuestion.find(filter)
      .populate("subject", "subjectName subjectCode")
      .populate("createdBy", "fullName email teacherId")
      .populate("sharedWith", "fullName email teacherId")
      .sort({ gradeLevel: 1, createdAt: -1 });

    const enriched = questions.map((question) => {
      const plain = question.toObject();
      plain.canManage = canManagePaper(plain, req.user);
      plain.isOwner = isPaperCreator(plain, req.user?._id);
      return plain;
    });

    res.status(200).json(enriched);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const shareEssayQuestion = async (req, res) => {
  try {
    const paper = await EssayQuestion.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    if (!canManagePaper(paper, req.user)) {
      return res.status(403).json({
        message: "Only the paper creator or an admin can share this paper",
      });
    }

    const teacherIds = Array.isArray(req.body.teacherIds)
      ? req.body.teacherIds.map(String)
      : [];

    if (!teacherIds.length) {
      return res.status(400).json({
        message: "teacherIds must be a non-empty array",
      });
    }

    const teachers = await User.find({
      _id: { $in: teacherIds },
      role: "teacher",
    }).select("_id");

    if (!teachers.length) {
      return res.status(400).json({
        message: "No valid teacher accounts found to share with",
      });
    }

    const creatorId = String(paper.createdBy || "");
    const nextShared = new Set(
      (paper.sharedWith || []).map((id) => String(id))
    );

    teachers.forEach((teacher) => {
      const id = String(teacher._id);
      if (id !== creatorId) nextShared.add(id);
    });

    paper.sharedWith = [...nextShared];
    await paper.save();

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Essay Question",
      description: `Paper shared with ${teachers.length} teacher(s)`,
    });

    const populated = await EssayQuestion.findById(paper._id)
      .populate("subject", "subjectName subjectCode")
      .populate("createdBy", "fullName email teacherId")
      .populate("sharedWith", "fullName email teacherId");

    res.status(200).json({
      message: "Paper shared successfully",
      essayQuestion: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const copyEssayQuestion = async (req, res) => {
  try {
    const source = await EssayQuestion.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ message: "Paper not found" });
    }

    const isOwner = isPaperCreator(source, req.user?._id);
    const isShared = (source.sharedWith || []).some(
      (id) => String(id) === String(req.user?._id)
    );

    if (
      req.user?.role === "teacher" &&
      !isOwner &&
      !isShared &&
      !isAdminRole(req.user?.role)
    ) {
      // Allow copy only for owned or shared papers.
      const owned = await EssayQuestion.findOne({
        _id: source._id,
        ...(await getOwnedPapersFilter(req.user._id)),
      }).select("_id");

      if (!owned) {
        return res.status(403).json({
          message: "You can only copy papers you own or that were shared with you",
        });
      }
    }

    const copy = await EssayQuestion.create({
      subject: source.subject,
      question: source.question,
      maxMarks: source.maxMarks,
      gradeLevel: source.gradeLevel,
      createdBy: req.user?._id,
      sharedWith: [],
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Essay Question",
      description: `Copied essay paper from ${source._id}`,
    });

    const populated = await EssayQuestion.findById(copy._id)
      .populate("subject", "subjectName subjectCode")
      .populate("createdBy", "fullName email teacherId");

    res.status(201).json({
      message: "Paper copied to My Papers",
      essayQuestion: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEssayQuestion = async (req, res) => {
  try {
    const paper = await EssayQuestion.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    if (!canManagePaper(paper, req.user)) {
      return res.status(403).json({
        message: "Only the paper creator or an admin can edit this paper",
      });
    }

    const { subject, question, maxMarks, gradeLevel } = req.body;

    if (gradeLevel !== undefined) {
      const resolvedGradeLevel = Number(gradeLevel);
      if (![12, 13].includes(resolvedGradeLevel)) {
        return res.status(400).json({
          message: "gradeLevel must be 12 or 13",
        });
      }
      paper.gradeLevel = resolvedGradeLevel;
    }

    if (subject !== undefined) paper.subject = subject;
    if (question !== undefined) {
      if (!String(question).trim()) {
        return res.status(400).json({ message: "question cannot be empty" });
      }
      paper.question = String(question).trim();
    }
    if (maxMarks !== undefined) paper.maxMarks = Number(maxMarks);

    await paper.save();

    await createAuditLog({
      userId: req.user?._id,
      action: "UPDATE",
      module: "Essay Question",
      description: `Essay paper updated: ${paper._id}`,
    });

    const populated = await EssayQuestion.findById(paper._id)
      .populate("subject", "subjectName subjectCode")
      .populate("createdBy", "fullName email teacherId")
      .populate("sharedWith", "fullName email teacherId");

    res.status(200).json({
      message: "Paper updated successfully",
      essayQuestion: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEssayQuestion = async (req, res) => {
  try {
    const paper = await EssayQuestion.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    if (!canManagePaper(paper, req.user)) {
      return res.status(403).json({
        message: "Only the paper creator or an admin can delete this paper",
      });
    }

    await MarkingScheme.deleteMany({ question: paper._id });
    await EssayQuestion.deleteOne({ _id: paper._id });

    await createAuditLog({
      userId: req.user?._id,
      action: "DELETE",
      module: "Essay Question",
      description: `Essay paper deleted: ${paper._id}`,
    });

    res.status(200).json({
      message: "Paper deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getShareCandidates = async (req, res) => {
  try {
    const teachers = await User.find({
      role: "teacher",
      _id: { $ne: req.user._id },
      isActive: { $ne: false },
    })
      .select("fullName email teacherId")
      .sort({ fullName: 1 });

    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
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