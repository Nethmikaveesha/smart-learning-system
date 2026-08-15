import mongoose from "mongoose";

/**
 * Stores Commerce multi-class (High / Medium / Low) risk predictions
 * returned by the Flask ML service.
 */
const commerceRiskSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
    },
    inputData: {
      type: Object,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["Low Risk", "Medium Risk", "High Risk"],
      required: true,
    },
    mlResponse: {
      type: Object,
    },
    predictedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CommerceRisk", commerceRiskSchema);
