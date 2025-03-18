const express = require('express');
const router = express.Router();
const Ticket = require('../models/ticket');

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().lean();
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets', error: error.message });
  }
});

module.exports = router; 