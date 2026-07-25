import express from "express";
import {
  createContentRecommendation,
  generateContentRecommendation,
  getAllContentRecommendations,
  getContentByTopic,
} from "../controllers/contentRecommendationController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/generate",
  protect,
  authorizeRoles("admin", "teacher"),
  generateContentRecommendation
);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  createContentRecommendation
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher", "student"),
  getAllContentRecommendations
);

router.get(
  "/topic/:topic",
  protect,
  authorizeRoles("admin", "teacher", "student"),
  getContentByTopic
);

export default router;