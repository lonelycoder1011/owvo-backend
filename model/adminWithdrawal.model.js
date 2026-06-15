import mongoose from "mongoose";

const adminWithdrawalSchema = new mongoose.Schema(
  {
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
      enum: ["requested", "processing", "paid", "failed"],
      default: "requested",
    },
    stripePayoutId: {
      type: String,
      default: "",
      trim: true,
    },
    stripeAccountId: {
      type: String,
      default: "",
      trim: true,
    },
    stripeDashboardUrl: {
      type: String,
      default: "",
      trim: true,
    },
    failureReason: {
      type: String,
      default: "",
      trim: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

adminWithdrawalSchema.index({ status: 1, createdAt: -1 });

export const AdminWithdrawal = mongoose.model("AdminWithdrawal", adminWithdrawalSchema);
