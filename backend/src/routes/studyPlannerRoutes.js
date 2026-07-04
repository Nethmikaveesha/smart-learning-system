import express from "express";
import {
  generateStudyPlan,
  generateRevisionTimetable,
} from "../controllers/studyPlannerController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("student"),
  generateStudyPlan
);

router.get(
  "/revision-timetable",
  protect,
  authorizeRoles("student"),
  generateRevisionTimetable
);

export default router;