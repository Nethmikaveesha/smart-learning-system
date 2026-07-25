import express from "express";

import {
  getAdaptiveLearningPlan,
  generateAdaptiveMaterials,
} from "../controllers/adaptiveLearningController.js";

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

router.post(
  "/generate",
  protect,
  authorizeRoles("student"),
  generateAdaptiveMaterials
);

export default router;