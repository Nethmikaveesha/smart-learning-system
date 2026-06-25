import express from "express";

import {
  createStudentProfile,
  getAllStudentProfiles,
  updateStudentProfile,
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

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateStudentProfile
);

export default router;