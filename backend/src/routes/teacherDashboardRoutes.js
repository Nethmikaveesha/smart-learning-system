import express from "express";
import { getTeacherDashboard } from "../controllers/teacherDashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("teacher", "admin"),
  getTeacherDashboard
);

export default router;