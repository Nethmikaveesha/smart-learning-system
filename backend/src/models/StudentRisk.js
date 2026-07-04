import mongoose from "mongoose";

const studentRiskSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
    },
    inputData: {
      type: Object,
      required: true,
    },
    performanceClass: {
      type: String,
      enum: ["H", "M", "L"],
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["Low Risk", "Medium Risk", "High Risk"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("StudentRisk", studentRiskSchema);