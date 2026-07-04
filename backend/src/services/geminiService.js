import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

console.log("API Key Exists:", !!process.env.GEMINI_API_KEY);
console.log(
  "API Key Prefix:",
  process.env.GEMINI_API_KEY?.substring(0, 5)
);

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

export const evaluateEssayWithGemini = async (
  question,
  answer,
  maxMarks
) => {
  try {
    const model = genAI.getGenerativeModel({
      model:"gemini-2.5-flash",
    });

    const prompt = `
You are an A/L Commerce examiner.

Question:
${question}

Student Answer:
${answer}

Maximum Marks:
${maxMarks}

Return ONLY valid JSON:

{
  "marks": 0,
  "feedback": "short feedback",
  "missingPoints": []
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("Gemini Response:", text);

    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.log("Gemini Error:", error.message);

    return {
      marks: 0,
      feedback:
        "Gemini evaluation failed. Please use teacher review.",
      missingPoints: [],
    };
  }
};

export const analyzeEssayTopicsWithGemini = async (
  question,
  answer,
  modelAnswer
) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are an A/L examiner and learning analytics assistant.

Question:
${question}

Student Answer:
${answer}

Model Answer:
${modelAnswer}

Analyze the student's answer and return ONLY valid JSON:
{
  "weakTopics": ["topic1", "topic2"],
  "missingConcepts": ["concept1", "concept2"],
  "strongAreas": ["area1", "area2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanText = text.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.log("Gemini Topic Analysis Error:", error.message);

    return {
      weakTopics: [],
      missingConcepts: [],
      strongAreas: [],
      improvementSuggestions: [
        "AI topic analysis failed. Please use teacher review.",
      ],
    };
  }
};