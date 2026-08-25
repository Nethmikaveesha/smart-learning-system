import express from "express";

import {
  generateStudentReport,
  testMonthlyReportGeneration,
  listGeneratedMonthlyReports,
  downloadGeneratedMonthlyReport,
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

// Admin: list + download generated monthly PDFs
router.get(
  "/monthly",
  protect,
  authorizeRoles("admin", "superadmin"),
  listGeneratedMonthlyReports
);

router.get(
  "/monthly/:fileName",
  protect,
  authorizeRoles("admin", "superadmin"),
  downloadGeneratedMonthlyReport
);

// Admin test trigger for automatic monthly PDF generation
router.post(
  "/monthly-generate-test",
  protect,
  authorizeRoles("admin", "superadmin"),
  testMonthlyReportGeneration
);

export default router;
