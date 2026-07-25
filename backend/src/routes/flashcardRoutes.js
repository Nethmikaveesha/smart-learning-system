import express from "express";
import {
  createFlashcard,
  getFlashcards,
  generateFlashcards,
} from "../controllers/flashcardController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/generate",
  protect,
  authorizeRoles("admin", "teacher", "student"),
  generateFlashcards
);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  createFlashcard
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher", "student"),
  getFlashcards
);

export default router;