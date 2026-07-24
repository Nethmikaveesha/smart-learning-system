import express from "express";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../controllers/settingsController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getSystemSettings
);

router.put(
  "/",
  protect,
  authorizeRoles("admin"),
  updateSystemSettings
);

export default router;
