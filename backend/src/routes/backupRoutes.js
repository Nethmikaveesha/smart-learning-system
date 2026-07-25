import express from "express";
import { createBackup, listBackups } from "../controllers/backupController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), listBackups);
router.post("/", protect, authorizeRoles("admin"), createBackup);

export default router;
