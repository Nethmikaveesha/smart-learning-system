import mongoose from "mongoose";

/**
 * Singleton-style system settings for EduTrack admin configuration.
 * Only one document is used in the app.
 */
const systemSettingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      default: "EduTrack Smart Learning System",
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: () => String(new Date().getFullYear()),
    },
    passMark: {
      type: Number,
      required: true,
      default: 40,
      min: 0,
      max: 100,
    },
    supportEmail: {
      type: String,
      default: "admin@edutrack.lk",
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Colombo",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
