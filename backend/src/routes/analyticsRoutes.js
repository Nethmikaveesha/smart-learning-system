import express from "express";
import { attendanceMarksCorrelation } from "../controllers/analyticsController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/attendance-marks",
  protect,
  authorizeRoles(
    "admin",
    "teacher",
    "student",
    "parent"
  ),
  attendanceMarksCorrelation
);

export default router;