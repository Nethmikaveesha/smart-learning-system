import { askCommerceChatbotWithGemini } from "../services/geminiService.js";

const COMMERCE_KEYWORDS = [
  "account",
  "ledger",
  "journal",
  "balance",
  "trial",
  "profit",
  "loss",
  "business",
  "market",
  "econom",
  "demand",
  "supply",
  "inflation",
  "attendance",
  "mark",
  "grade",
  "z-score",
  "z score",
  "rank",
  "exam",
  "revision",
  "study",
  "timetable",
  "commerce",
  "partnership",
  "company",
  "cost",
  "budget",
  "tax",
  "bank",
  "cash",
  "capital",
  "debtor",
  "creditor",
];

const UNSAFE_PATTERNS = [
  /how to (hack|cheat|steal)/i,
  /make (a |an )?(bomb|weapon|explosive)/i,
  /suicide|self[- ]?harm/i,
  /porn|sexually explicit/i,
];

function isUnsafeQuestion(text) {
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(text));
}

function isCommerceRelated(text) {
  const lower = text.toLowerCase();
  return COMMERCE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const cleanQuestion = question.trim();
    const text = cleanQuestion.toLowerCase();

    if (isUnsafeQuestion(cleanQuestion)) {
      return res.status(200).json({
        success: true,
        question: cleanQuestion,
        answer:
          "I can only help with safe academic questions about A/L Commerce studies. Please ask about Accounting, Business Studies, Economics, attendance, marks, or exam preparation.",
        source: "Safety Filter",
      });
    }

    if (!isCommerceRelated(cleanQuestion)) {
      return res.status(200).json({
        success: true,
        question: cleanQuestion,
        answer:
          "I only answer A/L Commerce questions (Accounting, Business Studies, Economics) plus study planning, attendance, marks, and exams. Please rephrase your question within those topics.",
        source: "Scope Filter",
      });
    }

    let fallbackAnswer =
      "Sorry, I could not generate an AI response. Please ask about Accounting, Business Studies, Economics, attendance, marks, Z-scores, or study planning.";

    if (text.includes("marketing")) {
      fallbackAnswer =
        "Marketing is the process of identifying customer needs and satisfying them profitably through products, pricing, promotion, and distribution.";
    } else if (text.includes("accounting")) {
      fallbackAnswer =
        "Accounting is the process of recording, classifying, summarizing, and interpreting financial transactions.";
    } else if (text.includes("economics")) {
      fallbackAnswer =
        "Economics studies how individuals, businesses, and governments allocate scarce resources to satisfy unlimited wants.";
    } else if (text.includes("attendance")) {
      fallbackAnswer =
        "Attendance is important because regular class participation improves understanding, revision consistency, and academic performance.";
    } else if (text.includes("z-score") || text.includes("z score")) {
      fallbackAnswer =
        "A Z-score shows how far a student's mark is from the class average using standard deviation.";
    } else if (text.includes("study plan") || text.includes("revision plan")) {
      fallbackAnswer =
        "A study plan helps students focus more time on weak subjects and revise consistently before exams.";
    }

    const aiResponse = await askCommerceChatbotWithGemini(cleanQuestion);

    const geminiFailed =
      !aiResponse?.answer ||
      aiResponse.answer ===
        "AI chatbot response failed. Please try again or ask your teacher.";

    const finalAnswer = geminiFailed ? fallbackAnswer : aiResponse.answer;

    const responseSource = geminiFailed
      ? "Rule-Based Fallback"
      : "Gemini AI";

    return res.status(200).json({
      success: true,
      question: cleanQuestion,
      answer: finalAnswer,
      source: responseSource,
    });
  } catch (error) {
    console.error("Chatbot Controller Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Chatbot request failed",
      error: error.message,
    });
  }
};
