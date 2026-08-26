import express from "express";
import {
  createBackup,
  listBackups,
  restoreBackup,
} from "../controllers/backupController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin"), listBackups);
router.post("/", protect, authorizeRoles("admin"), createBackup);
router.post("/restore", protect, authorizeRoles("admin"), restoreBackup);

export default router;
