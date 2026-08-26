import Flashcard from "../models/Flashcard.js";
import Subject from "../models/Subject.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { generateFlashcardsWithGemini } from "../services/geminiService.js";

export const createFlashcard = async (req, res) => {
  try {
    const { subject, topic, question, answer, difficulty } = req.body;

    if (!subject || !topic?.trim() || !question?.trim() || !answer?.trim()) {
      return res.status(400).json({
        message: "subject, topic, question, and answer are required",
      });
    }

    const flashcard = await Flashcard.create({
      subject,
      topic,
      question,
      answer,
      difficulty,
      createdBy: req.user?._id,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "Flashcards",
      description: `Flashcard created for topic: ${topic}`,
    });

    res.status(201).json({
      message: "Flashcard created successfully",
      flashcard,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getFlashcards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.topic) {
      filter.topic = { $regex: req.query.topic, $options: "i" };
    }

    // Students only see cards they created (plus legacy cards with no owner).
    if (req.user?.role === "student") {
      filter.$or = [
        { createdBy: req.user._id },
        { createdBy: { $exists: false } },
        { createdBy: null },
      ];
    }

    const flashcards = await Flashcard.find(filter)
      .populate("subject", "subjectName")
      .sort({ createdAt: -1 });

    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Generate flashcards from topic / lesson content using Gemini, then save.
 */
export const generateFlashcards = async (req, res) => {
  try {
    const {
      subject,
      topic,
      lessonContent = "",
      count = 5,
      save = true,
    } = req.body;

    if (!subject || !topic?.trim()) {
      return res.status(400).json({
        message: "Subject and topic are required to generate flashcards",
      });
    }

    const subjectRecord = await Subject.findById(subject).select(
      "subjectName subjectCode"
    );

    if (!subjectRecord) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const generated = await generateFlashcardsWithGemini({
      subjectName: subjectRecord.subjectName,
      topic: topic.trim(),
      lessonContent,
      count,
    });

    let flashcards = [];

    if (save) {
      flashcards = await Flashcard.insertMany(
        generated.cards.map((card) => ({
          subject,
          topic: topic.trim(),
          question: card.question,
          answer: card.answer,
          difficulty: card.difficulty || "Medium",
          createdBy: req.user?._id,
        }))
      );

      await createAuditLog({
        userId: req.user?._id,
        action: "CREATE",
        module: "Flashcards",
        description: `Generated ${flashcards.length} flashcards for topic: ${topic}`,
      });
    }

    res.status(200).json({
      message: save
        ? "Flashcards generated and saved"
        : "Flashcards generated successfully",
      generatedBy: generated.generatedBy,
      cards: generated.cards,
      flashcards,
      subject: subjectRecord,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
