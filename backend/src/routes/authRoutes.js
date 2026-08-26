import express from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", protect, authorizeRoles("admin"), registerUser);
router.post(
  "/register-admin",
  protect,
  authorizeRoles("superadmin"),
  registerAdmin
);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword);

export default router;
