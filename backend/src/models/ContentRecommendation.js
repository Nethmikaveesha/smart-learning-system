import mongoose from "mongoose";

const contentRecommendationSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
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

    videoLink: {
      type: String,
      default: "",
    },

    difficultyLevel: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "ContentRecommendation",
  contentRecommendationSchema
);