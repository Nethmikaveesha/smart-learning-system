export const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;
    const text = question.toLowerCase();

    let answer =
      "Sorry, I could not understand. Please ask about Accounting, Business Studies, Economics, attendance, marks, or study plan.";

    if (text.includes("marketing")) {
      answer =
        "Marketing is the process of identifying customer needs and satisfying them profitably through products, pricing, promotion, and distribution.";
    } else if (text.includes("accounting")) {
      answer =
        "Accounting is the process of recording, classifying, summarizing, and interpreting financial transactions.";
    } else if (text.includes("economics")) {
      answer =
        "Economics studies how individuals, businesses, and governments allocate scarce resources to satisfy unlimited wants.";
    } else if (text.includes("attendance")) {
      answer =
        "Attendance is important because regular class participation improves understanding, revision consistency, and academic performance.";
    } else if (text.includes("z-score") || text.includes("z score")) {
      answer =
        "A Z-score shows how far a student's mark is from the class average using standard deviation.";
    } else if (text.includes("study plan")) {
      answer =
        "A study plan helps students focus more time on weak subjects and revise consistently before exams.";
    }

    res.status(200).json({ question, answer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};