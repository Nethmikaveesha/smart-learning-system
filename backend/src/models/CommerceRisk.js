import mongoose from "mongoose";

/**
 * Commerce Stream Model predictions (High / Medium / Low Risk).
 * Primary project risk output — separate from FinalRisk (Pass/Fail).
 */
const commerceRiskSchema = new mongoose.Schema(
  {
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
      index: true,
    },

    studentId: {
      type: String,
      required: true,
      trim: true,
    },

    inputData: {
      accountingScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      businessStudiesScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      economicsScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      attendancePercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },

    riskLevel: {
      type: String,
      enum: ["Low Risk", "Medium Risk", "High Risk"],
      required: true,
    },

    modelName: {
      type: String,
      default: "Commerce Multi-Class Risk Model",
    },

    predictionSource: {
      type: String,
      enum: ["Manual", "Automatic"],
      default: "Automatic",
    },

    predictedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CommerceRisk", commerceRiskSchema);
