import express from "express";

import {
  addResult,
  getAllResults,
  calculateExamAnalytics,
  detectWeakStudents,
} from "../controllers/resultController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  addResult
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllResults
);
 router.put(
  "/analytics/:examId",
  protect,
  authorizeRoles("admin", "teacher"),
  calculateExamAnalytics
);

router.put(
  "/detect-weak/:examId",
  protect,
  authorizeRoles("admin", "teacher"),
  detectWeakStudents
);
export default router;