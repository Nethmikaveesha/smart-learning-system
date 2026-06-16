import express from "express";

import {
  createSubject,
  getAllSubjects,
} from "../controllers/subjectController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createSubject
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher"),
  getAllSubjects
);

export default router;