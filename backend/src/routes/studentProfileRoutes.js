import express from "express";

import {
  createStudentProfile,
  deleteStudentProfile,
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

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteStudentProfile
);

export default router;