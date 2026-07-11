import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import StudentProfile from "../src/models/StudentProfile.js";
import Subject from "../src/models/Subject.js";
import Class from "../src/models/Class.js";
import Exam from "../src/models/Exam.js";
import Result from "../src/models/Result.js";
import Attendance from "../src/models/Attendance.js";
import Flashcard from "../src/models/Flashcard.js";
import ContentRecommendation from "../src/models/ContentRecommendation.js";
import { calculateGrade } from "../src/utils/grading.js";

dotenv.config();

const DEMO_EMAIL = "student@test.com";

async function upsertExam({ examName, classId, subjectId, examDate }) {
  let exam = await Exam.findOne({ examName, class: classId, subject: subjectId });

  if (!exam) {
    exam = await Exam.create({
      examName,
      class: classId,
      subject: subjectId,
      examDate,
      totalMarks: 100,
    });
  }

  return exam;
}

async function upsertResult({ studentId, examId, marks, zScore = null, rank = null }) {
  const existing = await Result.findOne({ student: studentId, exam: examId });

  if (existing) {
    existing.marks = marks;
    existing.grade = calculateGrade(marks);
    if (zScore !== null) existing.zScore = zScore;
    if (rank !== null) existing.rank = rank;
    await existing.save();
    return existing;
  }

  return Result.create({
    student: studentId,
    exam: examId,
    marks,
    grade: calculateGrade(marks),
    rank: rank ?? 0,
    zScore: zScore ?? 0,
  });
}

async function calculateExamAnalytics(examId) {
  const results = await Result.find({ exam: examId }).sort({ marks: -1 });

  if (results.length === 0) return;

  const marksArray = results.map((result) => result.marks);
  const mean = marksArray.reduce((sum, mark) => sum + mark, 0) / marksArray.length;
  const variance =
    marksArray.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) /
    marksArray.length;
  const standardDeviation = Math.sqrt(variance);

  for (let index = 0; index < results.length; index += 1) {
    const zScore =
      standardDeviation === 0
        ? 0
        : Number(((results[index].marks - mean) / standardDeviation).toFixed(2));

    results[index].zScore = zScore;
    results[index].rank = index + 1;
    await results[index].save();
  }
}

async function seedAttendance(studentProfile, classId) {
  const existingCount = await Attendance.countDocuments({
    student: studentProfile._id,
  });

  if (existingCount >= 15) {
    return studentProfile.attendancePercentage;
  }

  const today = new Date();

  for (let day = 20; day >= 1; day -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - day);

    const status = day % 10 === 0 ? "Absent" : "Present";

    await Attendance.create({
      student: studentProfile._id,
      class: classId,
      date,
      status,
    });
  }

  const totalDays = await Attendance.countDocuments({
    student: studentProfile._id,
  });
  const presentDays = await Attendance.countDocuments({
    student: studentProfile._id,
    status: "Present",
  });

  const attendancePercentage =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  await StudentProfile.findByIdAndUpdate(studentProfile._id, {
    attendancePercentage,
  });

  return attendancePercentage;
}

async function seedFlashcards(subjects) {
  const flashcardData = [
    {
      subjectCode: "ACC101",
      topic: "Final Accounts",
      question: "What is the purpose of preparing final accounts?",
      answer:
        "Final accounts are prepared to identify business profit or loss and financial position at the end of an accounting period.",
      difficulty: "Medium",
    },
    {
      subjectCode: "ACC101",
      topic: "Depreciation",
      question: "Why is depreciation charged on fixed assets?",
      answer:
        "Depreciation allocates the cost of a fixed asset over its useful life and reflects wear and tear in financial statements.",
      difficulty: "Easy",
    },
    {
      subjectCode: "BS101",
      topic: "Marketing Mix",
      question: "What are the 4Ps of marketing?",
      answer: "Product, Price, Place, and Promotion.",
      difficulty: "Easy",
    },
    {
      subjectCode: "BS101",
      topic: "Entrepreneurship",
      question: "What is entrepreneurship?",
      answer:
        "Entrepreneurship is the process of identifying opportunities, taking risks, and creating value through new business ventures.",
      difficulty: "Medium",
    },
    {
      subjectCode: "ECO101",
      topic: "Demand and Supply",
      question: "What happens to equilibrium price when demand increases?",
      answer:
        "When demand increases and supply remains unchanged, equilibrium price rises.",
      difficulty: "Medium",
    },
    {
      subjectCode: "ECO101",
      topic: "Inflation",
      question: "What is inflation?",
      answer:
        "Inflation is a sustained increase in the general price level of goods and services in an economy.",
      difficulty: "Hard",
    },
  ];

  for (const card of flashcardData) {
    const subject = subjects.find((item) => item.subjectCode === card.subjectCode);
    if (!subject) continue;

    const exists = await Flashcard.findOne({
      subject: subject._id,
      question: card.question,
    });

    if (!exists) {
      await Flashcard.create({
        subject: subject._id,
        topic: card.topic,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
      });
    }
  }
}

async function seedContentRecommendations(subjects) {
  const contentData = [
    {
      subjectCode: "ACC101",
      topic: "Final Accounts",
      noteTitle: "Final Accounts Revision Notes",
      noteDescription:
        "Revise trading account, profit and loss account, and balance sheet preparation.",
      videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      difficultyLevel: "Medium",
    },
    {
      subjectCode: "BS101",
      topic: "Marketing",
      noteTitle: "Marketing Mix Study Guide",
      noteDescription:
        "Understand product, price, place, and promotion with Commerce A/L examples.",
      videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      difficultyLevel: "Easy",
    },
    {
      subjectCode: "ECO101",
      topic: "Microeconomics",
      noteTitle: "Demand & Supply Essentials",
      noteDescription:
        "Review demand curves, supply shifts, and market equilibrium problems.",
      videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      difficultyLevel: "Medium",
    },
  ];

  for (const item of contentData) {
    const subject = subjects.find((entry) => entry.subjectCode === item.subjectCode);
    if (!subject) continue;

    const exists = await ContentRecommendation.findOne({
      subject: subject._id,
      noteTitle: item.noteTitle,
    });

    if (!exists) {
      await ContentRecommendation.create({
        subject: subject._id,
        topic: item.topic,
        noteTitle: item.noteTitle,
        noteDescription: item.noteDescription,
        videoLink: item.videoLink,
        difficultyLevel: item.difficultyLevel,
      });
    }
  }
}

async function seedDemoStudent() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const user = await User.findOne({ email: DEMO_EMAIL });

  if (!user) {
    throw new Error(`Demo user not found: ${DEMO_EMAIL}`);
  }

  const studentProfile = await StudentProfile.findOne({ user: user._id }).populate(
    "class subjects"
  );

  if (!studentProfile) {
    throw new Error("Student profile not found for demo user");
  }

  const classId = studentProfile.class?._id;
  const subjects = await Subject.find({
    _id: { $in: studentProfile.subjects },
  });

  if (!classId || subjects.length === 0) {
    throw new Error("Demo student must have a class and assigned subjects");
  }

  const subjectByCode = Object.fromEntries(
    subjects.map((subject) => [subject.subjectCode, subject])
  );

  const attendancePercentage = await seedAttendance(studentProfile, classId);

  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 1);

  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 14);

  const exams = {
    accountingPast: await upsertExam({
      examName: "Term Test 1 - Accounting",
      classId,
      subjectId: subjectByCode.ACC101._id,
      examDate: pastDate,
    }),
    businessPast: await upsertExam({
      examName: "Term Test 1 - Business Studies",
      classId,
      subjectId: subjectByCode.BS101._id,
      examDate: pastDate,
    }),
    economicsPast: await upsertExam({
      examName: "Term Test 1 - Economics",
      classId,
      subjectId: subjectByCode.ECO101._id,
      examDate: pastDate,
    }),
    accountingUpcoming: await upsertExam({
      examName: "Term Test 2 - Accounting",
      classId,
      subjectId: subjectByCode.ACC101._id,
      examDate: upcomingDate,
    }),
    businessUpcoming: await upsertExam({
      examName: "Term Test 2 - Business Studies",
      classId,
      subjectId: subjectByCode.BS101._id,
      examDate: new Date(upcomingDate.getTime() + 3 * 24 * 60 * 60 * 1000),
    }),
    economicsUpcoming: await upsertExam({
      examName: "Term Test 2 - Economics",
      classId,
      subjectId: subjectByCode.ECO101._id,
      examDate: new Date(upcomingDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    }),
  };

  for (const exam of Object.values(exams)) {
    await calculateExamAnalytics(exam._id);
  }

  await upsertResult({
    studentId: studentProfile._id,
    examId: exams.accountingPast._id,
    marks: 82,
    zScore: 1.15,
    rank: 0,
  });
  await upsertResult({
    studentId: studentProfile._id,
    examId: exams.businessPast._id,
    marks: 68,
    zScore: 0.42,
    rank: 0,
  });
  await upsertResult({
    studentId: studentProfile._id,
    examId: exams.economicsPast._id,
    marks: 44,
    zScore: -1.08,
    rank: 0,
  });

  const legacyExam = await Exam.findOne({ examName: "Term Test 1" });
  if (legacyExam) {
    await Result.deleteOne({
      student: studentProfile._id,
      exam: legacyExam._id,
    });
  }

  const latestResult = await Result.findOne({ student: studentProfile._id })
    .sort({ updatedAt: -1 })
    .populate("exam");

  await StudentProfile.findByIdAndUpdate(studentProfile._id, {
    attendancePercentage,
    currentZScore: latestResult?.zScore || 0,
    riskStatus: "Low",
  });

  await seedFlashcards(subjects);
  await seedContentRecommendations(subjects);

  const summary = {
    studentId: studentProfile.studentId,
    attendancePercentage,
    results: await Result.countDocuments({ student: studentProfile._id }),
    exams: await Exam.countDocuments({ class: classId }),
    flashcards: await Flashcard.countDocuments(),
    contentRecommendations: await ContentRecommendation.countDocuments(),
  };

  console.log("Demo student data seeded successfully:");
  console.log(summary);

  await mongoose.disconnect();
}

seedDemoStudent().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
