import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Do not log GEMINI_API_KEY (or any prefix) — secrets must stay out of stdout/logs.
if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set; Gemini features will fail until configured.");
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

export const evaluateEssayWithGemini = async (
  question,
  answer,
  maxMarks
) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        marks: 0,
        feedback:
          "Gemini evaluation failed. Please use teacher review.",
        missingPoints: [],
      };
    }

    const model = genAI.getGenerativeModel({
      model:"gemini-2.5-flash",
    });

    const prompt = `
You are an A/L Commerce examiner. Evaluate the answer using marking criteria,
keyword coverage, answer relevance, and essay structure including introduction,
body, and conclusion.

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

    const parsed = JSON.parse(cleanText);
    return {
      ...parsed,
      marks: clampEssayMarks(parsed.marks, maxMarks),
    };
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

function clampEssayMarks(rawMarks, maxMarks) {
  const numeric = Number(rawMarks);
  const ceiling = Number(maxMarks);
  if (Number.isNaN(numeric) || Number.isNaN(ceiling)) return 0;
  return Math.min(ceiling, Math.max(0, numeric));
}

export const analyzeEssayTopicsWithGemini = async (
  question,
  answer,
  modelAnswer
) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        weakTopics: [],
        missingConcepts: [],
        strongAreas: [],
        improvementSuggestions: [
          "AI topic analysis failed. Please use teacher review.",
        ],
      };
    }

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
/**
 * Create personalised study notes from a student's weak / incorrect essay answer.
 */
export const generateAdaptiveMaterialFromErrorsWithGemini = async ({
  subjectName,
  question,
  studentAnswer,
  weakTopics = [],
  missingConcepts = [],
  feedback = "",
}) => {
  const topicLabel =
    weakTopics[0] || missingConcepts[0] || subjectName || "Exam revision";

  const fallback = {
    topic: topicLabel,
    noteTitle: `Revision focus: ${topicLabel}`,
    noteDescription: [
      `Based on your recent answer in ${subjectName || "this subject"}, revise these areas:`,
      "",
      ...(missingConcepts.length
        ? missingConcepts.map((item, index) => `${index + 1}. ${item}`)
        : ["1. Review the model answer structure and key terms."]),
      "",
      feedback ? `Teacher/system feedback: ${feedback}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    practiceTips: [
      "Rewrite the answer using the missing concepts.",
      "Practise one past-paper question on this topic.",
      "Make a short summary card of key definitions.",
    ],
    difficultyLevel: "Medium",
    generatedBy: "fallback",
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a Sri Lankan GCE A/L Commerce tutor.
Create personalised revision material from a student's weak essay attempt.

Subject: ${subjectName || "A/L Commerce"}
Question: ${question || "N/A"}
Student Answer (excerpt): ${(studentAnswer || "").slice(0, 1200)}
Weak Topics: ${(weakTopics || []).join(", ") || "None listed"}
Missing Concepts: ${(missingConcepts || []).join(", ") || "None listed"}
Feedback: ${feedback || "None"}

Return ONLY valid JSON:
{
  "topic": "main revision topic",
  "noteTitle": "short helpful title",
  "noteDescription": "structured study notes focused on correcting the mistakes (max 220 words)",
  "practiceTips": ["tip1", "tip2", "tip3"],
  "difficultyLevel": "Easy|Medium|Hard"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      topic: parsed.topic || fallback.topic,
      noteTitle: parsed.noteTitle || fallback.noteTitle,
      noteDescription: parsed.noteDescription || fallback.noteDescription,
      practiceTips: Array.isArray(parsed.practiceTips)
        ? parsed.practiceTips.slice(0, 5)
        : fallback.practiceTips,
      difficultyLevel: parsed.difficultyLevel || "Medium",
      generatedBy: "gemini",
    };
  } catch (error) {
    console.log("Gemini Adaptive Material Error:", error.message);
    return fallback;
  }
};

/**
 * Generate active-recall flashcards from a topic / lesson excerpt.
 */
export const generateFlashcardsWithGemini = async ({
  subjectName,
  topic,
  lessonContent = "",
  count = 5,
}) => {
  const safeCount = Math.min(Math.max(Number(count) || 5, 3), 8);

  const fallbackCards = Array.from({ length: safeCount }, (_, index) => ({
    question: `Q${index + 1}: What is an important point about ${topic}?`,
    answer: `Review the key idea #${index + 1} for ${topic} in ${
      subjectName || "this subject"
    }.`,
    difficulty: index < 2 ? "Easy" : index < 4 ? "Medium" : "Hard",
  }));

  try {
    if (!process.env.GEMINI_API_KEY) {
      return { cards: fallbackCards, generatedBy: "fallback" };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a Sri Lankan GCE A/L Commerce tutor creating active-recall flashcards.

Subject: ${subjectName || "A/L Commerce"}
Topic: ${topic}
Lesson content / notes:
${(lessonContent || "Use standard A/L syllabus knowledge for this topic.").slice(0, 2500)}

Create ${safeCount} flashcards. Return ONLY valid JSON:
{
  "cards": [
    {
      "question": "short recall question",
      "answer": "clear concise answer",
      "difficulty": "Easy|Medium|Hard"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];

    if (!cards.length) {
      return { cards: fallbackCards, generatedBy: "fallback" };
    }

    return {
      cards: cards.slice(0, safeCount).map((card, index) => ({
        question: card.question || fallbackCards[index]?.question,
        answer: card.answer || fallbackCards[index]?.answer,
        difficulty: ["Easy", "Medium", "Hard"].includes(card.difficulty)
          ? card.difficulty
          : "Medium",
      })),
      generatedBy: "gemini",
    };
  } catch (error) {
    console.log("Gemini Flashcard Generation Error:", error.message);
    return { cards: fallbackCards, generatedBy: "fallback" };
  }
};

/**
 * Generate study notes + a YouTube search link for A/L Commerce topics.
 */
export const generateStudyContentWithGemini = async ({
  subjectName,
  topic,
  difficultyLevel = "Medium",
}) => {
  const fallback = {
    noteTitle: `${topic} — Study Notes`,
    noteDescription: [
      `Key revision notes for ${topic} in ${subjectName || "A/L Commerce"}.`,
      "",
      "1. Review the main definitions and concepts.",
      "2. Practise past-paper style short answers.",
      "3. Check worked examples and common exam mistakes.",
      "4. Summarise the topic in your own words.",
    ].join("\n"),
    videoSearchQuery: `${subjectName || "A/L Commerce"} ${topic} Sri Lanka`,
    difficultyLevel,
    generatedBy: "fallback",
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        ...fallback,
        videoLink: buildYouTubeSearchLink(fallback.videoSearchQuery),
      };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a Sri Lankan GCE A/L Commerce tutor creating study materials for students.

Subject: ${subjectName || "A/L Commerce"}
Topic: ${topic}
Difficulty: ${difficultyLevel}

Create useful study content. Return ONLY valid JSON:
{
  "noteTitle": "short clear title",
  "noteDescription": "structured study notes with short paragraphs or numbered points (max 220 words)",
  "videoSearchQuery": "short YouTube search query for educational videos on this topic",
  "difficultyLevel": "${difficultyLevel}"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    const videoSearchQuery =
      parsed.videoSearchQuery ||
      `${subjectName || "A/L Commerce"} ${topic} tutorial`;

    return {
      noteTitle: parsed.noteTitle || fallback.noteTitle,
      noteDescription: parsed.noteDescription || fallback.noteDescription,
      videoSearchQuery,
      videoLink: buildYouTubeSearchLink(videoSearchQuery),
      difficultyLevel: parsed.difficultyLevel || difficultyLevel,
      generatedBy: "gemini",
    };
  } catch (error) {
    console.log("Gemini Content Generation Error:", error.message);
    return {
      ...fallback,
      videoLink: buildYouTubeSearchLink(fallback.videoSearchQuery),
    };
  }
};

function buildYouTubeSearchLink(query) {
  const q = encodeURIComponent(String(query || "").trim());
  return `https://www.youtube.com/results?search_query=${q}`;
}

export const askCommerceChatbotWithGemini = async (question) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a helpful Sri Lankan GCE A/L Commerce tutor.

Answer the student's question clearly and briefly.
Focus ONLY on Accounting, Business Studies, Economics, study planning, attendance, marks, and exam preparation.
If the question is outside that scope or inappropriate, reply with a short refusal telling the student to ask a Commerce study question instead.

Student Question:
${question}

Return ONLY valid JSON:
{
  "answer": "clear student-friendly answer"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.log("Gemini Chatbot Error:", error.message);

    return {
      answer:
        "AI chatbot response failed. Please try again or ask your teacher.",
    };
  }
};