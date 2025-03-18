const express = require("express");
const router = express.Router();
const Ticket = require("../models/ticket"); // Adjust path to your Ticket model

// Route to fetch tickets for the dashboard
router.get("/tickets/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 }); // Sort by creation date, newest first

    res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to create a new ticket
router.post("/tickets", async (req, res) => {
  const { ticketId, userId, issueDescription, domain, priorityScore, attachedFileId } = req.body;

  try {
    const newTicket = new Ticket({
      ticketId,
      userId,
      issueDescription,
      domain,
      priorityScore,
      attachedFileId,
    });

    await newTicket.save();
    res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;