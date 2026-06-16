import mongoose from "mongoose";

const essayQuestionSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    question: {
      type: String,
      required: true,
    },

    maxMarks: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "EssayQuestion",
  essayQuestionSchema
);