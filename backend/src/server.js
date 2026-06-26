
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import {
  protect,
  authorizeRoles,
} from "./middleware/authMiddleware.js";
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
dotenv.config();
connectDB();
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

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Smart Learning System API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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