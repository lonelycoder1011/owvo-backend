import express from "express";
import {
  createRating,
  getRatingByBooking,
  getRatingsByWasher,
  getWasherAverageRating,
} from "../controller/rating.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createRating);
router.get("/booking/:bookingId", protect, getRatingByBooking);
router.get("/average/:washerId", getWasherAverageRating);
router.get("/washer/:washerId", protect, getRatingsByWasher);

export default router;
