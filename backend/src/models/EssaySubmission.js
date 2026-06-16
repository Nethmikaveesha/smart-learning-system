import mongoose from "mongoose";

const essaySubmissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EssayQuestion",
      required: true,
    },

    answer: {
      type: String,
      required: true,
    },

    marks: {
      type: Number,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "EssaySubmission",
  essaySubmissionSchema
);