import express from "express";

import {
  createStudentProfile,
  getAllStudentProfiles,
} from "../controllers/studentProfileController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createStudentProfile
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllStudentProfiles
);

export default router;