import express from "express";
import { getStudentBadges } from "../controllers/badgeController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/student",
  protect,
  authorizeRoles("student"),
  getStudentBadges
);

export default router;