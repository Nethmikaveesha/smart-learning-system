import mongoose from "mongoose";

const markingSchemeSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EssayQuestion",
      required: true,
    },

    keywords: [
      {
        type: String,
      },
    ],

    modelAnswer: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "MarkingScheme",
  markingSchemeSchema
);