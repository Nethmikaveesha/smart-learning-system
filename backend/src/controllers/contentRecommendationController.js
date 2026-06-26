import ContentRecommendation from "../models/ContentRecommendation.js";
import { createAuditLog } from "../utils/createAuditLog.js";

export const createContentRecommendation = async (req, res) => {
  try {
    const {
      subject,
      topic,
      noteTitle,
      noteDescription,
      videoLink,
      difficultyLevel,
    } = req.body;

    const content = await ContentRecommendation.create({
      subject,
      topic,
      noteTitle,
      noteDescription,
      videoLink,
      difficultyLevel,
    });

    await createAuditLog({
      userId: req.user?._id,
      action: "CREATE",
      module: "AI Content Recommendation",
      description: `Content recommendation created for topic: ${topic}`,
    });

    res.status(201).json({
      message: "Content recommendation created successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllContentRecommendations = async (req, res) => {
  try {
    const contents = await ContentRecommendation.find()
      .populate("subject", "subjectName")
      .sort({ createdAt: -1 });

    res.status(200).json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getContentByTopic = async (req, res) => {
  try {
    const { topic } = req.params;

    const contents = await ContentRecommendation.find({
      topic: { $regex: topic, $options: "i" },
    }).populate("subject", "subjectName");

    res.status(200).json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};