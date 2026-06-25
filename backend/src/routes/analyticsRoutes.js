import express from "express";
    
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  attendanceMarksCorrelation,
  attendanceGradesCorrelation,
} from "../controllers/analyticsController.js";

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
router.get(
  "/attendance-grades",
  protect,
  authorizeRoles("admin", "teacher", "student", "parent"),
  attendanceGradesCorrelation
);

export default router;