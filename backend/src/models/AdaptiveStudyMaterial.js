import mongoose from "mongoose";

const adaptiveStudyMaterialSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
    sourceSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EssaySubmission",
    },
    topic: {
      type: String,
      required: true,
    },
    noteTitle: {
      type: String,
      required: true,
    },
    noteDescription: {
      type: String,
      required: true,
    },
    practiceTips: {
      type: [String],
      default: [],
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    missingConcepts: {
      type: [String],
      default: [],
    },
    difficultyLevel: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    generatedBy: {
      type: String,
      default: "gemini",
    },
  },
  { timestamps: true }
);

adaptiveStudyMaterialSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model(
  "AdaptiveStudyMaterial",
  adaptiveStudyMaterialSchema
);
