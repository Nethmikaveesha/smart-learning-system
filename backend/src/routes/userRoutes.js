import express from "express";

import {
  deleteUser,
  disableUser,
  getAllUsers,
  getTeachersWithAssignments,
  getUserById,
  updateUser,
} from "../controllers/userController.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAllUsers
);

router.get(
  "/teachers",
  protect,
  authorizeRoles("admin"),
  getTeachersWithAssignments
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  getUserById
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateUser
);

router.put(
  "/:id/disable",
  protect,
  authorizeRoles("admin"),
  disableUser
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteUser
);

export default router;
