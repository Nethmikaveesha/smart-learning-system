import Flashcard from "../models/Flashcard.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const createFlashcard = async (req, res) => {
  try {
    const {
      subject,
      topic,
      question,
      answer,
      difficulty,
    } = req.body;

    const flashcard = await Flashcard.create({
      subject,
      topic,
      question,
      answer,
      difficulty,
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
    const flashcards = await Flashcard.find()
      .populate("subject", "subjectName")
      .sort({ createdAt: -1 });

    res.status(200).json(flashcards);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};