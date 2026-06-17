import express from "express";
import { generateStudyPlan } from "../controllers/studyPlannerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("student"),
  generateStudyPlan
);

export default router;