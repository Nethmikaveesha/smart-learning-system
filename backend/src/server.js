
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
dotenv.config();
connectDB();

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