import express from "express";
import {
  getAllUsers,
  getAllProviders,
  changeUserRole,
  deleteUser,
} from "../controller/admin.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users", protect, getAllUsers);
router.get("/providers", protect, getAllProviders);
router.patch("/users/:userId/role", protect, changeUserRole);
router.delete("/users/:userId", protect, deleteUser);

export default router;