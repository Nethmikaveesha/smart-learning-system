import express from "express";

import { getAdaptiveLearningPlan } from "../controllers/adaptiveLearningController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("student"),
  getAdaptiveLearningPlan
);

export default router;