const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Changed from "Customer" to "User"
    issueDescription: { type: String, required: true },
    domain: {
      type: String,
      enum: [
        "Retail Banking & Customer Support",
        "Loan & Credit Department",
        "Payments & Clearing Department",
        "Wealth Management & Deposit Services",
        "Regulatory & Compliance Department",
      ],
      required: true,
    },
    priorityScore: { type: Number, min: 0, max: 100, required: true }, // Updated max to 100
    assignedEmployees: [
      {
        employeeId: { type: String, required: true },
        assignedAt: { type: Date, default: Date.now },
        workDone: { type: String }, // Work done by this employee
      },
    ],
    status: {
      type: String,
      enum: ["Open", "In Progress", "Queued", "On Hold", "Completed"],
      default: "Open",
    },
    createdAt: { type: Date, default: Date.now }, // Date Created
    closedAt: { type: Date }, // Close Date
    customerFeedback: { type: String }, // Customer Feedback
    summaryOfWork: { type: String }, // Summary of Work Done
    attachedFileId: { type: String, default: null }, // Attached file ID
    meetLink: { type: String, required: false }, // Optional Google Meet link
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);
module.exports = Ticket;