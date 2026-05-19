import express from "express";
import { createUserRating } from "../controller/userRating.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createUserRating);

export default router;
