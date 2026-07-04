import mongoose from "mongoose";

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



export default mongoose.model(
  "EssaySubmission",
  essaySubmissionSchema
);

