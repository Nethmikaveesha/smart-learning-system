import mongoose from "mongoose";

const markPartSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    maxMarks: { type: Number, required: true },
    recommendedMarks: { type: Number, required: true },
    teacherMarks: { type: Number, default: null },
    ratio: { type: Number, default: 0 },
    details: {
      matchedKeywords: [String],
      missingKeywords: [String],
    },
  },
  { _id: false }
);

const essaySubmissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EssayQuestion",
      required: true,
    },

    answer: {
      type: String,
      required: true,
    },

    marks: {
      type: Number,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    finalMarks: {
      type: Number,
      default: null,
    },

    teacherFeedback: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Modified"],
      default: "Pending",
    },

    // Part-wise AI recommended marks (keywords + structure).
    markBreakdown: {
      parts: [markPartSchema],
      recommendedTotal: { type: Number, default: 0 },
      teacherTotal: { type: Number, default: null },
      maxMarks: { type: Number, default: 10 },
      scoringMethod: { type: String, default: "keywords_and_structure" },
    },

    topicAnalysis: {
      weakTopics: [String],
      missingConcepts: [String],
      strongAreas: [String],
      improvementSuggestions: [String],
    },

    nlpEvaluation: {
      marks: {
        type: Number,
        default: 0,
      },
      semanticSimilarity: {
        type: Number,
        default: 0,
      },
      keywordCoverage: {
        type: Number,
        default: 0,
      },
      structureScore: {
        type: Number,
        default: 0,
      },
      structureAnalysis: {
        score: {
          type: Number,
          default: 0,
        },
        introduction: {
          type: Number,
          default: 0,
        },
        body: {
          type: Number,
          default: 0,
        },
        conclusion: {
          type: Number,
          default: 0,
        },
        feedback: {
          type: String,
          default: "",
        },
      },
      matchedKeywords: [String],
      missingKeywords: [String],
      feedback: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("EssaySubmission", essaySubmissionSchema);
