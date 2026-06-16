import express from "express";
import {
  createClass,
  getAllClasses,
} from "../controllers/classController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createClass);
router.get("/", protect, authorizeRoles("admin", "teacher"), getAllClasses);

export default router;