import express from "express";
import { askChatbot } from "../controllers/chatbotController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/ask",
  protect,
  authorizeRoles("student", "teacher", "admin"),
  askChatbot
);

export default router;