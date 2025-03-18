const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    faceImage: {
      type: String,
      required: true,
    },
    aadhaarDetails: {
      aadhaarNumber: {
        type: String,
        required: false,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verificationDate: {
        type: Date,
      },
    },
    panDetails: {
      panNumber: {
        type: String,
        required: false,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verificationDate: {
        type: Date,
      },
    },
    address: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: false,
    },
    age: {
      type: Number,
      required: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    customerPriority: {
      type: String,
      enum: ["Low", "Medium", "High", "Premium"],
      default: "Medium",
    },
    customerPriorityScore: {
      // Note: You had this twice; keeping only one
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    // New fields added below
    averageHoldings: {
      type: Number, // Stored in rupees, e.g., 1600000 for 16 lakhs
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true, // Assume user is active by default when created
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check if password matches
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;