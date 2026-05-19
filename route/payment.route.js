import express from "express";
import {
  createPayment,
  confirmPayment,
  stripeWebhook,
} from "../controller/payment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Stripe webhook must receive the raw body. The raw parser is mounted in server.js.
router.post("/webhook/stripe", stripeWebhook);

// Create Payment
router.post("/create-payment", protect, createPayment);

// Capture Payment
router.post("/confirm-payment", protect, confirmPayment);

export default router;
