import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    catalogKey: {
      type: String,
      trim: true,
    },
    serviceType: {
      type: String,
      enum: ["basic", "standard", "premium"],
      required: true,
    },
    title: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    carSize: {
      type: String,
      enum: ["small", "medium", "high"],
      required: true,
    },
    carName: {
      type: String,
      required: true,
      trim: true,
    },
    carModel: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Service = mongoose.model("Service", serviceSchema);
