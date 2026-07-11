import mongoose from "mongoose";

const dataRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requesterRole: {
      type: String,
      enum: ["user", "provider"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    requestNote: {
      type: String,
      trim: true,
      default: "",
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    exportData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    exportGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

dataRequestSchema.index({ user: 1, status: 1, createdAt: -1 });
dataRequestSchema.index({ status: 1, createdAt: -1 });

export const DataRequest = mongoose.model("DataRequest", dataRequestSchema);
