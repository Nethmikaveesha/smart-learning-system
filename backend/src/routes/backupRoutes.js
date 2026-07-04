import express from "express";

import { createBackup } from "../controllers/backupController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  createBackup
);

export default router;