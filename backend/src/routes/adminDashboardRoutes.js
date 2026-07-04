import express from "express";
import { getAdminDashboard } from "../controllers/adminDashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAdminDashboard
);

export default router;