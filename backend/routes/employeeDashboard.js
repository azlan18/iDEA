const express = require('express');
const router = express.Router();
const Ticket = require('../models/ticket');
const User = require('../models/userModel');
const Pan = require('../models/panModel');
const Aadhaar = require('../models/aadhaarModel');
const path = require('path');
const fs = require('fs');

// Mock employees array for the ticket assignment logic
const employees = [];

// Helper function to check if an employee is eligible for a ticket domain
const isEligibleEmployee = (employee, domain) => {
  return true; // Placeholder logic
};

// Helper function to assign a ticket to an employee
const assignTicketToEmployee = async (ticket, employee) => {
  ticket.status = "In Progress";
  
  const existingEmployeeIndex = ticket.assignedEmployees.findIndex(
    emp => emp.employeeId === employee.id
  );
  
  if (existingEmployeeIndex < 0) {
    ticket.assignedEmployees.push({
      employeeId: employee.id,
      assignedAt: new Date(),
      workDone: ""
    });
  }
  
  employee.isFree = false;
  employee.currentTicket = { ticketId: ticket.ticketId };
  
  await ticket.save();
  return ticket;
};

// Get all tickets with pagination and filtering
router.get('/tickets', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      domain, 
      sortBy = 'createdAt',
      sortOrder = 'desc',
      employeeId
    } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    const skip = (page - 1) * limit;
    const query = {
      'assignedEmployees.employeeId': employeeId
    };
    
    if (status) query.status = status;
    if (domain) query.domain = domain;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const tickets = await Ticket.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'firstName lastName email phoneNumber');
      
    const totalTickets = await Ticket.countDocuments(query);
    
    res.json({
      tickets,
      totalPages: Math.ceil(totalTickets / limit),
      currentPage: parseInt(page),
      totalTickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket by ID with user details
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })
      .populate('userId', 'firstName lastName email phoneNumber address gender age verified customerPriority');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update ticket status
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    ticket.status = status;
    if (status === 'Completed') {
      ticket.closedAt = new Date();
    }
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// NEW PATCH ROUTE: Update ticket with meetLink or other fields
router.patch('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params; // ticketId
    const updates = req.body; // e.g., { meetLink: "https://meet.google.com/..." }

    const ticket = await Ticket.findOne({ ticketId: id });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Apply updates (e.g., meetLink)
    Object.assign(ticket, updates);

    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add work update to a ticket
router.post('/tickets/:id/workupdate', async (req, res) => {
  try {
    const { employeeId, workDone } = req.body;
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const existingEmployeeIndex = ticket.assignedEmployees.findIndex(
      emp => emp.employeeId === employeeId
    );
    
    if (existingEmployeeIndex >= 0) {
      ticket.assignedEmployees[existingEmployeeIndex].workDone = workDone;
    } else {
      ticket.assignedEmployees.push({
        employeeId,
        assignedAt: new Date(),
        workDone
      });
    }
    
    ticket.summaryOfWork = ticket.assignedEmployees
      .map(emp => `${emp.employeeId}: ${emp.workDone}`)
      .join('\n');
    
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error adding work update:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete a ticket
router.post("/tickets/complete", async (req, res) => {
  const { ticketId, customerFeedback, summaryOfWork } = req.body;
  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "Completed")
      return res.status(400).json({ error: "Ticket already completed" });

    ticket.status = "Completed";
    ticket.closedAt = new Date();
    ticket.customerFeedback = customerFeedback || '';
    
    if (summaryOfWork) {
      ticket.summaryOfWork = summaryOfWork;
    }

    const lastEmployee = ticket.assignedEmployees[ticket.assignedEmployees.length - 1];
    let freedEmployee = null;
    if (lastEmployee) {
      freedEmployee = employees.find(emp => emp.id === lastEmployee.employeeId);
      if (freedEmployee) {
        freedEmployee.isFree = true;
        freedEmployee.currentTicket = null;
      }
    }

    await ticket.save();

    if (freedEmployee) {
      const queuedTicket = await Ticket.findOne({ status: "Queued" }).sort({ createdAt: 1 });
      if (queuedTicket && isEligibleEmployee(freedEmployee, queuedTicket.domain)) {
        await assignTicketToEmployee(queuedTicket, freedEmployee);
      } else {
        const heldTicket = await Ticket.findOne({
          "assignedEmployees.employeeId": freedEmployee.id,
          status: "On Hold",
        }).sort({ updatedAt: -1 });
        if (heldTicket) {
          await assignTicketToEmployee(heldTicket, freedEmployee);
        }
      }
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error completing ticket:', error);
    res.status(400).json({ error: error.message });
  }
});

// Put a ticket on hold
router.post("/tickets/hold", async (req, res) => {
  const { ticketId, holdReason } = req.body;
  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "On Hold")
      return res.status(400).json({ error: "Ticket already on hold" });
    if (ticket.status === "Completed")
      return res.status(400).json({ error: "Cannot hold a completed ticket" });

    ticket.status = "On Hold";
    
    const lastEmployee = ticket.assignedEmployees[ticket.assignedEmployees.length - 1];
    let freedEmployee = null;
    if (lastEmployee) {
      lastEmployee.workDone = holdReason || "Waiting for external requirements";
      freedEmployee = employees.find(emp => emp.id === lastEmployee.employeeId);
      if (freedEmployee) {
        freedEmployee.isFree = true;
        freedEmployee.currentTicket = null;
      }
    }

    await ticket.save();

    if (freedEmployee) {
      const queuedTicket = await Ticket.findOne({ status: "Queued" }).sort({ createdAt: 1 });
      if (queuedTicket && isEligibleEmployee(freedEmployee, queuedTicket.domain)) {
        await assignTicketToEmployee(queuedTicket, freedEmployee);
      }
    }

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error putting ticket on hold:', error);
    res.status(400).json({ error: error.message });
  }
});

// Resume a ticket from hold
router.post("/tickets/resume", async (req, res) => {
  const { ticketId, employeeId } = req.body;
  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status !== "On Hold")
      return res.status(400).json({ error: "Ticket is not on hold" });

    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    if (!isEligibleEmployee(employee, ticket.domain)) {
      return res.status(400).json({ error: "Employee not eligible for this ticket domain" });
    }

    if (!employee.isFree && employee.currentTicket) {
      const currentTicket = await Ticket.findOne({ ticketId: employee.currentTicket.ticketId });
      if (currentTicket) {
        currentTicket.status = "On Hold";
        await currentTicket.save();
      }
    }

    await assignTicketToEmployee(ticket, employee);
    ticket.status = "In Progress";
    await ticket.save();

    res.status(200).json(ticket);
  } catch (error) {
    console.error('Error resuming ticket:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user verification details (Aadhaar and PAN)
router.get('/user/:id/verification', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let aadhaarDetails = null;
    let panDetails = null;
    
    if (user.aadhaarDetails?.aadhaarNumber) {
      aadhaarDetails = await Aadhaar.findOne({ 
        aadhaarNumber: user.aadhaarDetails.aadhaarNumber 
      });
    }
    
    if (user.panDetails?.panNumber) {
      panDetails = await Pan.findOne({ 
        panNumber: user.panDetails.panNumber 
      });
    }
    
    res.json({
      userId: user._id,
      aadhaarDetails: aadhaarDetails ? {
        fullName: aadhaarDetails.fullName,
        address: aadhaarDetails.address,
        phoneNumber: aadhaarDetails.phoneNumber,
        age: aadhaarDetails.age,
        gender: aadhaarDetails.gender,
        fatherName: aadhaarDetails.fatherName,
        verified: user.aadhaarDetails?.verified || false,
        aadhaarNumber: aadhaarDetails.aadhaarNumber?.slice(-4).padStart(12, '*')
      } : null,
      panDetails: panDetails ? {
        fullName: panDetails.fullName,
        phoneNumber: panDetails.phoneNumber,
        tax_filing_status: panDetails.tax_filing_status,
        income_range: panDetails.income_range,
        is_verified: panDetails.is_verified,
        credit_score: panDetails.credit_score,
        spending_behavior: panDetails.spending_behavior,
        benchmark_data: panDetails.benchmark_data,
        loan_history: panDetails.loan_history,
        panNumber: `${panDetails.panNumber.slice(0, 2)}****${panDetails.panNumber.slice(-2)}`
      } : null
    });
  } catch (error) {
    console.error('Error fetching user verification details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket attachment
router.get('/attachments/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { download } = req.query;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    let contentType = 'application/octet-stream';
    if (fileId.endsWith('.pdf')) contentType = 'application/pdf';
    if (fileId.endsWith('.jpg') || fileId.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (fileId.endsWith('.png')) contentType = 'image/png';
    if (fileId.endsWith('.wav')) contentType = 'audio/wav';
    if (fileId.endsWith('.mp3')) contentType = 'audio/mpeg';
    if (fileId.endsWith('.webm')) contentType = 'video/webm';
    if (fileId.endsWith('.mp4')) contentType = 'video/mp4';

    res.setHeader('Content-Type', contentType);

    const disposition = download === 'true' ? 'attachment' : 'inline';
    const originalFileName = fileId.split('_').pop() || fileId;
    res.setHeader('Content-Disposition', `${disposition}; filename="${originalFileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket statistics
router.get('/statistics', async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    const employeeTickets = await Ticket.find({
      'assignedEmployees.employeeId': employeeId
    });
    
    const employeeOpenTickets = employeeTickets.filter(t => t.status === 'Open').length;
    const employeeInProgressTickets = employeeTickets.filter(t => t.status === 'In Progress').length;
    const employeeQueuedTickets = employeeTickets.filter(t => t.status === 'Queued').length;
    const employeeOnHoldTickets = employeeTickets.filter(t => t.status === 'On Hold').length;
    const employeeCompletedTickets = employeeTickets.filter(t => t.status === 'Completed').length;
    
    const domainDistribution = [];
    const domainCounts = {};
    
    employeeTickets.forEach(ticket => {
      if (!domainCounts[ticket.domain]) {
        domainCounts[ticket.domain] = 0;
      }
      domainCounts[ticket.domain]++;
    });
    
    for (const [domain, count] of Object.entries(domainCounts)) {
      domainDistribution.push({ _id: domain, count });
    }
    
    const priorityDistribution = [
      { _id: 'Low', count: employeeTickets.filter(t => t.priorityScore <= 30).length },
      { _id: 'Medium', count: employeeTickets.filter(t => t.priorityScore > 30 && t.priorityScore <= 70).length },
      { _id: 'High', count: employeeTickets.filter(t => t.priorityScore > 70).length }
    ];
    
    res.json({
      totalTickets: employeeTickets.length,
      statusDistribution: {
        open: employeeOpenTickets,
        inProgress: employeeInProgressTickets,
        queued: employeeQueuedTickets,
        onHold: employeeOnHoldTickets,
        completed: employeeCompletedTickets
      },
      domainDistribution,
      priorityDistribution
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;