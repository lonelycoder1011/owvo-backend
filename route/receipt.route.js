import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  generateReceipt,
  getReceiptByBooking,
} from "../controller/receipt.controller.js";

const router = express.Router();

router.post("/", protect, generateReceipt);
router.get("/booking/:bookingId", protect, getReceiptByBooking);

export default router;
