import express from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
} from "../controllers/authController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", protect, authorizeRoles("admin"), registerUser);
router.post("/register-admin", protect, authorizeRoles("admin"), registerAdmin);
router.post("/login", loginUser);

export default router;
