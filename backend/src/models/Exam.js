import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: true,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    examDate: {
      type: Date,
      required: true,
    },

    totalMarks: {
      type: Number,
      default: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);