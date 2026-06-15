import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed"],
      default: "pending",
    },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    payoutDate: { type: Date },
    paidAt: { type: Date },
    failureReason: { type: String, trim: true, default: "" },
    stripeTransferId: { type: String, trim: true, default: "" },
    stripeDestinationAccountId: { type: String, trim: true, default: "" },
    stripeMode: {
      type: String,
      enum: ["manual", "stripe_transfer"],
      default: "manual",
    },
    manualAdjustmentAmount: { type: Number, default: 0 },
    manualAdjustmentReason: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

payoutSchema.index({ provider: 1, createdAt: -1 });
payoutSchema.index({ status: 1, payoutDate: 1 });

export const Payout = mongoose.model("Payout", payoutSchema);
