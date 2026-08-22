import express from "express";
import {
  createEssayQuestion,
  createMarkingScheme,
  getMarkingSchemes,
  submitEssay,
  approveEssaySubmission,
  getAllEssaySubmissions,
  getEssayQuestions,
  shareEssayQuestion,
  copyEssayQuestion,
  updateEssayQuestion,
  deleteEssayQuestion,
  getShareCandidates,
} from "../controllers/essayController.js";
import { getTeacherTopicErrorAnalytics } from "../controllers/teacherDashboardController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/questions",
  protect,
  authorizeRoles("admin", "teacher"),
  createEssayQuestion
);

router.get(
  "/questions",
  protect,
  authorizeRoles("admin", "teacher", "student"),
  getEssayQuestions
);

router.put(
  "/questions/:id",
  protect,
  authorizeRoles("admin", "teacher"),
  updateEssayQuestion
);

router.delete(
  "/questions/:id",
  protect,
  authorizeRoles("admin", "teacher"),
  deleteEssayQuestion
);

router.post(
  "/questions/:id/share",
  protect,
  authorizeRoles("admin", "teacher"),
  shareEssayQuestion
);

router.post(
  "/questions/:id/copy",
  protect,
  authorizeRoles("admin", "teacher"),
  copyEssayQuestion
);

router.get(
  "/share-candidates",
  protect,
  authorizeRoles("admin", "teacher"),
  getShareCandidates
);

router.post(
  "/marking-schemes",
  protect,
  authorizeRoles("admin", "teacher"),
  createMarkingScheme
);

router.get(
  "/marking-schemes",
  protect,
  authorizeRoles("admin", "teacher"),
  getMarkingSchemes
);

router.post(
  "/submit",
  protect,
  authorizeRoles("student"),
  submitEssay
);

router.put(
  "/submissions/:submissionId/approve",
  protect,
  authorizeRoles("admin", "teacher"),
  approveEssaySubmission
);

router.get(
  "/submissions",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllEssaySubmissions
);

router.get(
  "/topic-error-analytics",
  protect,
  authorizeRoles("teacher", "admin"),
  getTeacherTopicErrorAnalytics
);

export default router;