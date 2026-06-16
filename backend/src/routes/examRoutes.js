import express from "express";

import {
  createExam,
  getAllExams,
} from "../controllers/examController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  createExam
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllExams
);

export default router;