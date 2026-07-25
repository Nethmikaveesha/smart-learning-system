import express from "express";
import {
  getTeacherDashboard,
  getTeacherTopicErrorAnalytics,
  getTeacherScoreTrends,
} from "../controllers/teacherDashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("teacher", "admin"),
  getTeacherDashboard
);

router.get(
  "/score-trends",
  protect,
  authorizeRoles("teacher", "admin"),
  getTeacherScoreTrends
);

export default router;