import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    allowedPostalCodes: [
      { type: String, uppercase: true, trim: true, required: true },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const Coupon = mongoose.model("Coupon", couponSchema);
