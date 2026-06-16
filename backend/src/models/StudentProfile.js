import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentId: {
      type: String,
      required: true,
      unique: true,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    attendancePercentage: {
      type: Number,
      default: 0,
    },

    currentZScore: {
      type: Number,
      default: 0,
    },

    riskStatus: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "StudentProfile",
  studentProfileSchema
);