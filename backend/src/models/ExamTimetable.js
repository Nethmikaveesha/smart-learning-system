import mongoose from "mongoose";

const examTimetableSchema = new mongoose.Schema(
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

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: "Main Hall",
    },

    instructions: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExamTimetable", examTimetableSchema);