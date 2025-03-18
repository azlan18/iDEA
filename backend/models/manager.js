const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const managerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true, trim: true, unique: true },
    role: {
      type: String,
      enum: ["Manager", "Senior Manager", "Admin"],
      default: "Manager",
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
managerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check if password matches
managerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

managerSchema.index({ email: 1 });
managerSchema.index({ phoneNumber: 1 });

const Manager = mongoose.model("Manager", managerSchema);
module.exports = Manager;
