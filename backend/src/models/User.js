import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "teacher", "student", "parent"],
      default: "student",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    teacherId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },

    parentId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },

    relationship: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
