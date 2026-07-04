import express from "express";

import {
  generateStudentReport,
  testMonthlyReportGeneration,
} from "../controllers/reportController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Parent manual PDF download
router.get(
  "/student-report",
  protect,
  authorizeRoles("parent"),
  generateStudentReport
);

// Admin test trigger for automatic monthly PDF generation
router.post(
  "/monthly-generate-test",
  protect,
  authorizeRoles("admin"),
  testMonthlyReportGeneration
);

export default router;