import mongoose from "mongoose";

const essayQuestionSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    // A/L year group for this essay paper (Grade 12 or 13).
    gradeLevel: {
      type: Number,
      enum: [12, 13],
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

export default mongoose.model("EssayQuestion", essayQuestionSchema);
