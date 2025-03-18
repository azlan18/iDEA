const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Ticket = require("../models/ticket");
const Manager = require("../models/manager");
const employees = require("../data/employees");
const calculatePriority = require("../models/priority");
const calculateFraudRisk = require("../models/fraudRisk");
const calculateLoanRisk = require("../models/loanRisk");
const Pan = require("../models/panModel");
const Aadhaar = require("../models/aadhaarModel");
const auth = require("../middleware/auth");

// Configuration for file upload
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = {
  video: [".mp4", ".webm", ".mov", ".avi"],
  audio: [".wav", ".mp3", ".webm"],
};
const UPLOAD_FOLDER = path.resolve(__dirname, "../uploads");

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueId = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = ALLOWED_EXTENSIONS.video.includes(ext);
    const isAudio = ALLOWED_EXTENSIONS.audio.includes(ext);
    if (isVideo || isAudio) {
      file.mediaType = isVideo ? "video" : "audio";
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Allowed: " +
            [...ALLOWED_EXTENSIONS.video, ...ALLOWED_EXTENSIONS.audio].join(", ")
        )
      );
    }
  },
});

// Python server configuration
const PYTHON_SERVER = "http://localhost:5001";
const PYTHON_TIMEOUT = 300000; // 5 minutes timeout

const pythonServer = axios.create({
  baseURL: PYTHON_SERVER,
  timeout: PYTHON_TIMEOUT,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Helper functions
function isEligibleEmployee(employee, domain) {
  return employee.domains.includes(domain);
}

async function assignTicketToEmployee(ticket, employee) {
  ticket.assignedEmployees.push({
    employeeId: employee.id,
    assignedAt: new Date(),
    workDone: "",
  });
  employee.isFree = false;
  employee.currentTicket = {
    ticketId: ticket.ticketId,
    domain: ticket.domain,
  };
  await ticket.save();
}

async function assignTicket(ticket) {
  const eligibleEmployees = employees.filter(
    emp => isEligibleEmployee(emp, ticket.domain) && emp.isFree
  );
  if (eligibleEmployees.length > 0) {
    const employee = eligibleEmployees[0];
    await assignTicketToEmployee(ticket, employee);
    ticket.status = "Assigned";
  } else {
    ticket.status = "Queued";
    await ticket.save();
  }
}

router.post("/pan", async (req, res) => {
  try {
    const {
      panNumber,
      fullName,
      phoneNumber,
      tax_filing_status,
      income_range,
      spending_behavior,
      cibil_id,
      credit_score,
      loan_history,
    } = req.body;

    const pan = new Pan({
      panNumber,
      fullName,
      phoneNumber,
      tax_filing_status: tax_filing_status || "Filed",
      income_range,
      spending_behavior,
      cibil_id,
      credit_score,
      loan_history: loan_history || [],
    });

    await pan.save();
    res.status(201).json({
      id: pan._id,
      panNumber: pan.panNumber,
      fullName: pan.fullName,
      phoneNumber: pan.phoneNumber,
      credit_score: pan.credit_score,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/aadhaar", async (req, res) => {
  try {
    const { aadhaarNumber, fullName, address, phoneNumber, age, gender, fatherName, photo } =
      req.body;

    const aadhaar = new Aadhaar({
      aadhaarNumber,
      fullName,
      address,
      phoneNumber,
      age,
      gender,
      fatherName,
      photo,
    });

    await aadhaar.save();
    res.status(201).json({
      id: aadhaar._id,
      aadhaarNumber: aadhaar.aadhaarNumber,
      fullName: aadhaar.fullName,
      phoneNumber: aadhaar.phoneNumber,
      age: aadhaar.age,
      gender: aadhaar.gender,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/process", async (req, res) => {
  try {
    const { userId, file_id } = req.body;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Validate file_id
    if (!file_id) {
      return res.status(400).json({ error: "No file_id provided" });
    }

    console.log("Processing file:", file_id);
    const filePath = path.resolve(UPLOAD_FOLDER, file_id);
    console.log("File path:", filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    console.log("Sending request to Python server with file:", file_id);
    const pythonResponse = await pythonServer.post("/process", { file_name: file_id });
    console.log("Python response:", pythonResponse.data);

    const {
      transcription,
      translated_text,
      sentiment,
      confidence,
      department,
      language,
      file_path,
    } = pythonResponse.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let selectedDepartment;
    if (Array.isArray(department)) {
      const validDepartments = department.filter(
        (d) => d && typeof d === "string" && d.trim() !== ""
      );
      selectedDepartment = validDepartments.length > 0 ? validDepartments[0] : null;
    } else {
      selectedDepartment =
        department && typeof department === "string" ? department.trim() : null;
    }
    console.log("Selected department:", selectedDepartment);

    const allowedDomains = [
      "Retail Banking & Customer Support",
      "Loan & Credit Department",
      "Payments & Clearing Department",
      "Wealth Management & Deposit Services",
      "Regulatory & Compliance Department",
    ];
    console.log("Allowed domains:", allowedDomains);

    if (!selectedDepartment || !allowedDomains.includes(selectedDepartment)) {
      console.log(
        "Department validation failed. Selected:",
        selectedDepartment,
        "Allowed:",
        allowedDomains
      );
      return res.status(400).json({
        error: "Not sufficient data found, please try again",
        details: "No valid department detected in the recording",
        pythonResponse: pythonResponse.data,
      });
    }

    const ticket = new Ticket({
      ticketId: `TICKET-${Date.now()}`,
      userId: userId, // Renamed from customerId
      issueDescription: translated_text || "No description provided",
      domain: selectedDepartment,
      priorityScore: user.customerPriorityScore || 0, // Assuming this field name stays the same
      attachedFileId: file_id || null,
    });

    await assignTicket(ticket);

    res.json({
      message: "Processing complete and ticket created",
      ticket: {
        ticketId: ticket.ticketId,
        userId: ticket.userId, // Renamed from customerId
        issueDescription: ticket.issueDescription,
        domain: ticket.domain,
        priorityScore: ticket.priorityScore,
        attachedFileId: ticket.attachedFileId,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      processingResults: {
        transcription,
        sentiment,
        confidence,
        language,
        file_path,
      },
    });
  } catch (error) {
    console.error("Processing error:", error.message);
    if (error.response) {
      console.error("Python server response:", error.response.data);
      console.error("Response status:", error.response.status);
      return res.status(500).json({
        error: "Processing failed",
        details: error.response.data,
      });
    } else if (error.code === "ECONNREFUSED") {
      return res.status(503).json({ error: "Python server is not running" });
    }
    res.status(500).json({ error: "Processing failed: " + error.message });
  }
});


// Public routes
router.post("/customer/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, type: "customer" },
       "your-secret-key",
      { expiresIn: "1d" }
    );

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        type: "customer",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/employee/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    const employee = employees.find(emp => emp.id === employeeId);

    if (!employee || employee.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: employee.id, type: "employee" },
      "your-secret-key",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: employee.id,
        type: employee.type,
        role: "employee",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/customer", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      faceImage,
      aadhaarDetails,
      panDetails,
      address,
      gender,
      age,
    } = req.body;

    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      phoneNumber,
      faceImage,
      aadhaarDetails: aadhaarDetails || {},
      panDetails: panDetails || {},
      address,
      gender,
      age,
    });

    user.customerPriorityScore = await calculatePriority(user);
    await user.save();
    res.status(201).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      faceImage: user.faceImage,
      customerPriority: user.customerPriority,
      customerPriorityScore: user.customerPriorityScore,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/tickets", async (req, res) => {
  const { issueDescription, domain, fileId, userId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ticket = new Ticket({
      ticketId: `TICKET-${Date.now()}`,
      customerId: customerId,
      issueDescription,
      domain,
      priorityScore: user.customerPriorityScore,
      attachedFileId: fileId || null,
    });

    await assignTicket(ticket);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/tickets/:userId", async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.params.userId }).populate(
      "customerId",
      "firstName lastName email"
    );
    res.status(200).json(tickets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/tickets/complete", async (req, res) => {
  const { ticketId, customerFeedback, summaryOfWork } = req.body;
  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.status === "Completed")
      return res.status(400).json({ error: "Ticket already completed" });

    ticket.status = "Completed";
    ticket.closedAt = new Date();
    ticket.customerFeedback = customerFeedback;
    ticket.summaryOfWork = summaryOfWork;

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
    res.status(400).json({ error: error.message });
  }
});

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
    res.status(400).json({ error: error.message });
  }
});

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
    ticket.status = "Assigned";
    await ticket.save();

    res.status(200).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/manager", async (req, res) => {
  try {
    const manager = new Manager(req.body);
    await manager.save();
    res.status(201).json(manager);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/manager/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, role } = req.body;

    const manager = new Manager({
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      phoneNumber,
      role: role || "Manager",
    });

    await manager.save();
    res.status(201).json({
      id: manager._id,
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.email,
      phoneNumber: manager.phoneNumber,
      role: manager.role,
      isActive: manager.isActive,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/manager/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const manager = await Manager.findOne({ email });

    if (!manager) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await manager.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: manager._id, email: manager.email, type: "manager" },
      "your-secret-key",
      { expiresIn: "1d" }
    );

    // Update lastLogin
    manager.lastLogin = new Date();
    await manager.save();

    res.status(200).json({
      token,
      user: {
        id: manager._id,
        email: manager.email,
        firstName: manager.firstName,
        lastName: manager.lastName,
        phoneNumber: manager.phoneNumber,
        role: manager.role,
        type: "manager",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/manager/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find().populate("userId", "firstName lastName email");
    res.status(200).json(tickets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/loan/assessment", async (req, res) => {
  try {
    const { customerId } = req.body;
    const user = await User.findById(customerId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const fraudRisk = await calculateFraudRisk(user);
    const loanRisk = await calculateLoanRisk(user);

    res.status(200).json({
      fraudRisk,
      loanRisk,
      assessment: {
        isEligible: fraudRisk < 70 && loanRisk < 70,
        recommendedAmount: calculateRecommendedAmount(user, fraudRisk, loanRisk),
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileName = req.file.filename;
    const filePath = path.join(UPLOAD_FOLDER, fileName);
    const mediaType =
      req.file.mediaType || (req.file.mimetype.startsWith("video/") ? "video" : "audio");

    console.log(`File saved as: ${filePath}`);
    res.json({
      file_id: fileName,
      media_type: mediaType,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});

router.get("/media/:fileId", (req, res) => {
  try {
    const filePath = path.join(UPLOAD_FOLDER, req.params.fileId);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving file" });
  }
});

function calculateRecommendedAmount(user, fraudRisk, loanRisk) {
  return 100000; // Example value
}

module.exports = router;