import mongoose from "mongoose";

const washHistorySchema = new mongoose.Schema({
  washer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Washer",
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

export const WashHistory = mongoose.model("WashHistory", washHistorySchema);
