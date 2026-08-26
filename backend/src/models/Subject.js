import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    subjectCode: {
      type: String,
      unique: true,
    },

    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Co-teachers who teach this subject (Add Teacher / Subjects board).
    // Singular assignedTeacher is only the board "lead" display pointer and
    // must not erase other teachers' access when reassigned.
    assignedTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subject", subjectSchema);