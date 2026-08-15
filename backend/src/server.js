import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import {
  protect,
  authorizeRoles,
} from "./middleware/authMiddleware.js";
import { notFoundHandler, errorHandler } from "./middleware/errorMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import studentProfileRoutes from "./routes/studentProfileRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import parentDashboardRoutes from "./routes/parentDashboardRoutes.js";
import studentDashboardRoutes from "./routes/studentDashboardRoutes.js";
import teacherDashboardRoutes from "./routes/teacherDashboardRoutes.js";
import essayRoutes from "./routes/essayRoutes.js";
import studyPlannerRoutes from "./routes/studyPlannerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import examTimetableRoutes from "./routes/examTimetableRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import riskNotificationRoutes from "./routes/riskNotificationRoutes.js";
import contentRecommendationRoutes from "./routes/contentRecommendationRoutes.js";
import flashcardRoutes from "./routes/flashcardRoutes.js";
import adaptiveLearningRoutes from "./routes/adaptiveLearningRoutes.js";
import badgeRoutes from "./routes/badgeRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import {
  startMonthlyReportScheduler,
} from "./jobs/monthlyReportJob.js";
import {
  startDatabaseBackupScheduler,
} from "./jobs/databaseBackupJob.js";

connectDB();
startMonthlyReportScheduler();
startDatabaseBackupScheduler();

const app = express();

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl / Postman) with no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Smart Learning System API Running");
});

app.get("/api/profile", protect, (req, res) => {
  res.json({
    message: "Protected Route Access Granted",
    user: req.user,
  });
});

app.get(
  "/api/admin/test",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({ message: "Admin route access granted" });
  }
);

app.get(
  "/api/teacher/test",
  protect,
  authorizeRoles("teacher", "admin"),
  (req, res) => {
    res.json({ message: "Teacher route access granted" });
  }
);

app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/student-profiles", studentProfileRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/parent-dashboard", parentDashboardRoutes);
app.use("/api/student-dashboard", studentDashboardRoutes);
app.use("/api/teacher-dashboard", teacherDashboardRoutes);
app.use("/api/essays", essayRoutes);
app.use("/api/study-planner", studyPlannerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/exam-timetables", examTimetableRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/risk-notifications", riskNotificationRoutes);
app.use("/api/content-recommendations", contentRecommendationRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/adaptive-learning", adaptiveLearningRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/admin-dashboard", adminDashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/contact", contactRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
