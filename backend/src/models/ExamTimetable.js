import mongoose from "mongoose";

const examTimetableSchema = new mongoose.Schema(
  {
    // Optional link to a Marks exam so schedule + marks stay aligned.
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },

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

examTimetableSchema.index(
  { exam: 1 },
  {
    unique: true,
    partialFilterExpression: { exam: { $type: "objectId" } },
  }
);

export default mongoose.model("ExamTimetable", examTimetableSchema);
