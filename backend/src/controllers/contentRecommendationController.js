import ContentRecommendation from "../models/ContentRecommendation.js";
import Subject from "../models/Subject.js";
import { createAuditLog } from "../utils/createAuditLog.js";
import { generateStudyContentWithGemini } from "../services/geminiService.js";

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
      module: "Content Recommendation",
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

/**
 * Generate study notes + video search link with Gemini.
 * Optional save=true stores the content for student recommendations.
 */
export const generateContentRecommendation = async (req, res) => {
  try {
    const {
      subject,
      topic,
      difficultyLevel = "Medium",
      save = false,
    } = req.body;

    if (!subject || !topic?.trim()) {
      return res.status(400).json({
        message: "Subject and topic are required to generate content",
      });
    }

    const subjectRecord = await Subject.findById(subject).select(
      "subjectName subjectCode"
    );

    if (!subjectRecord) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const generated = await generateStudyContentWithGemini({
      subjectName: subjectRecord.subjectName,
      topic: topic.trim(),
      difficultyLevel,
    });

    let content = null;

    if (save) {
      content = await ContentRecommendation.create({
        subject,
        topic: topic.trim(),
        noteTitle: generated.noteTitle,
        noteDescription: generated.noteDescription,
        videoLink: generated.videoLink,
        difficultyLevel: generated.difficultyLevel || difficultyLevel,
      });

      await createAuditLog({
        userId: req.user?._id,
        action: "CREATE",
        module: "Content Recommendation",
        description: `Generated study content for topic: ${topic}`,
      });
    }

    res.status(200).json({
      message: save
        ? "Study content generated and saved"
        : "Study content generated successfully",
      generated,
      content,
      subject: subjectRecord,
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