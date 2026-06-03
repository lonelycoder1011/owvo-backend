import mongoose from "mongoose";

const issueReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ["user", "provider", "admin"],
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    photo: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
    },
  },
  { timestamps: true }
);

issueReportSchema.index({ reporter: 1, createdAt: -1 });
issueReportSchema.index({ booking: 1, createdAt: -1 });
issueReportSchema.index({ status: 1, createdAt: -1 });

export const IssueReport = mongoose.model("IssueReport", issueReportSchema);
