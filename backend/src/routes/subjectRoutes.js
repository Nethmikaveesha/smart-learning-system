import express from "express";

import {
  createSubject,
  updateSubject,
  getAllSubjects,
  getSubjectCatalog,
} from "../controllers/subjectController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/catalog",
  protect,
  authorizeRoles("admin"),
  getSubjectCatalog
);
router.post("/", protect, authorizeRoles("admin"), createSubject);
router.put("/:id", protect, authorizeRoles("admin"), updateSubject);
router.get("/", protect, authorizeRoles("admin", "teacher"), getAllSubjects);

export default router;
