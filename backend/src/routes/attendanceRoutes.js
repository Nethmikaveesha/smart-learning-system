import express from "express";

import {
  markAttendance,
  getAllAttendance,
  getAttendanceByStudent,
} from "../controllers/attendanceController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  markAttendance
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllAttendance
);

router.get(
  "/student/:studentId",
  protect,
  authorizeRoles("admin", "teacher", "parent", "student"),
  getAttendanceByStudent
);

export default router;