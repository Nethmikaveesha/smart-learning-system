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
      enum: ["superadmin", "admin", "teacher", "student", "parent"],
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

    // Admin-assigned teaching links (source of truth for Add Teacher list).
    // Subject.assignedTeacher / Class.assignedTeacher are singular and get
    // overwritten when another teacher shares the same subject/class.
    assignedSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },

    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
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

    // Hashed one-time token for forgot-password resets
    passwordResetToken: {
      type: String,
      default: undefined,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: undefined,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
