import express from "express";
import {
  createExamTimetable,
  getAllExamTimetables,
  updateExamTimetable,
  deleteExamTimetable,
} from "../controllers/examTimetableController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  createExamTimetable
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher", "student", "parent"),
  getAllExamTimetables
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "teacher"),
  updateExamTimetable
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteExamTimetable
);

export default router;