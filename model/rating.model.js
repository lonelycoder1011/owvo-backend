import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, 
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    isLowRating: {
      type: Boolean,
      default: false,
    },
    requiresReview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Rating = mongoose.model("Rating", ratingSchema);
