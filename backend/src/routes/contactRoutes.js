import express from "express";
import {
  submitContactMessage,
  listContactMessages,
} from "../controllers/contactController.js";
import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", submitContactMessage);
router.get("/", protect, authorizeRoles("admin"), listContactMessages);

export default router;
