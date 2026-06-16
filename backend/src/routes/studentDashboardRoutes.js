import express from "express";
import { getStudentDashboard } from "../controllers/studentDashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("student"),
  getStudentDashboard
);

export default router;