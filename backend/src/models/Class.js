import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },

    // A/L year group — used to distinguish Grade 12 vs Grade 13.
    gradeLevel: {
      type: Number,
      enum: [12, 13],
      required: true,
    },

    stream: {
      type: String,
      default: "Commerce",
    },

    medium: {
      type: String,
      default: "English",
    },

    academicYear: {
      type: String,
      required: true,
    },

    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Class", classSchema);
