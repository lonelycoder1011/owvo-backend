import mongoose from "mongoose";

const paymentInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    bookingId: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
    },
    providerId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    price: { type: Number, required: true },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["complete", "pending", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["success", "failed","pending"],
      default: "pending",
    },
    seasonId: { type: String },
    transactionId: { type: String },
    paymentMethodNonce: { type: String },
    paymentMethod: { type: String },
    type: { type: String, enum: ["donation", "booking", "tips"] },
  },
  {
    timestamps: true,
  }
);

export const paymentInfo = mongoose.model("paymentInfo", paymentInfoSchema);
