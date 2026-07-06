import express from "express";
import {
  registerUser,
  loginUser,
} from "../controllers/authController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", protect, authorizeRoles("admin"), registerUser);
router.post("/login", loginUser);

export default router;
