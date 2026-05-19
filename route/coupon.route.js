import express from "express";
import {
  createCoupon,
  getAllCoupons,
  applyCoupon,
} from "../controller/coupon.controller.js";

const router = express.Router();

router.post("/create", createCoupon);
router.get("/", getAllCoupons);
router.post("/apply", applyCoupon);

export default router;
