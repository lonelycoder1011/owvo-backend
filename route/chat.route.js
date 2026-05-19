import express from "express";
import { getBookingMessages } from "../controller/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/booking/:bookingId/messages", protect, getBookingMessages);

export default router;
