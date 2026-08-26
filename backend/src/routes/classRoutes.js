import express from "express";
import {
  createClass,
  updateClass,
  getAllClasses,
  getClassCatalog,
} from "../controllers/classController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/catalog", protect, authorizeRoles("admin"), getClassCatalog);
router.post("/", protect, authorizeRoles("admin"), createClass);
router.put("/:id", protect, authorizeRoles("admin"), updateClass);
router.get("/", protect, authorizeRoles("admin", "teacher"), getAllClasses);

export default router;
