const mongoose = require("mongoose");

const aadhaarSchema = new mongoose.Schema(
  {
    aadhaarNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 12,
      maxlength: 12,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String, // Base64 encoded image
      required: false,
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

// Create indexes for faster queries
aadhaarSchema.index({ aadhaarNumber: 1 });
aadhaarSchema.index({ phoneNumber: 1 });

const Aadhaar = mongoose.model("Aadhaar", aadhaarSchema);

module.exports = Aadhaar;
