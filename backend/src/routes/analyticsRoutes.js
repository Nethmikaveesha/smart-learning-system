import express from "express";
    
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  attendanceMarksCorrelation,
  attendanceGradesCorrelation,
  getInstitutionalTrends,
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

router.get(
  "/institutional-trends",
  protect,
  authorizeRoles("admin"),
  getInstitutionalTrends
);

export default router;