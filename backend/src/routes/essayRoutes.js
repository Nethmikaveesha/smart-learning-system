import express from "express";
import {
  createEssayQuestion,
  createMarkingScheme,
  submitEssay,
  approveEssaySubmission,
  getAllEssaySubmissions,
} from "../controllers/essayController.js";

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

router.post(
  "/marking-schemes",
  protect,
  authorizeRoles("admin", "teacher"),
  createMarkingScheme
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

export default router;