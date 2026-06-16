import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    marks: {
      type: Number,
      required: true,
      min: 0,
    },

    grade: {
      type: String,
      default: "",
    },

    zScore: {
      type: Number,
      default: 0,
    },

    rank: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Result", resultSchema);