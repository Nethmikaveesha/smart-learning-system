import express from "express";
import { getParentDashboard } from "../controllers/parentDashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("parent"),
  getParentDashboard
);

export default router;