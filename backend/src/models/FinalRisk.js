import mongoose from "mongoose";

const finalRiskSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
    },
    inputData: {
      type: Object,
      required: true,
    },
    passPrediction: {
      type: Number,
      enum: [0, 1],
      required: true,
    },
    predictedResult: {
      type: String,
      enum: ["Pass", "Fail"],
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["Low Risk", "High Risk"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("FinalRisk", finalRiskSchema);
