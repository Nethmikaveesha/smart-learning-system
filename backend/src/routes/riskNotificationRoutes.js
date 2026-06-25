import express from "express";
import { getRiskNotifications } from "../controllers/riskNotificationController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "teacher", "parent"),
  getRiskNotifications
);

export default router;