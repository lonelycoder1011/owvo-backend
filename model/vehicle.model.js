import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    registrationNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    make: {
      type: String,
      required: true,
      trim: true, 
    },
    model: {
      type: String,
      required: true,
      trim: true, 
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: 2100,
    },
    size: {
      type: String,
      required: true,
      enum: ["Small Car", "Medium Car", "Large Car", "Small Van", "Motorbike", "Jeep"],
    },
    image: {
      type: String,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ user: 1, registrationNo: 1 }, { unique: true });

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
