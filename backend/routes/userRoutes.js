const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Aadhaar = require('../models/aadhaarModel');
const Pan = require('../models/panModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const calculatePriority = require('../models/priority');

const generateRandomHoldings = () => {
  const min = 0; // Minimum: 0 rupees
  const max = 5000000; // Maximum: 50 lakhs (50,00,000 rupees)
  return Math.floor(Math.random() * (max - min + 1)) + min; // Random integer between 0 and 50 lakhs
};

// Register user
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      faceImage,
      phoneNumber,
      aadhaarNumber,
      panNumber,
      averageHoldings, // Optional in request body
      isActive, // Optional in request body
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      faceImage,
      phoneNumber,
      aadhaarDetails: {
        aadhaarNumber,
        verified: true,
        verificationDate: new Date(),
      },
      panDetails: {
        panNumber,
        verified: true,
        verificationDate: new Date(),
      },
      verified: true,
      customerPriority: "Medium", // Default
      averageHoldings: averageHoldings !== undefined ? averageHoldings : generateRandomHoldings(), // Random if not provided
      isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
    });

    const priorityScore = await calculatePriority(user);
    user.customerPriorityScore = priorityScore;

    await user.save();

    const token = jwt.sign({ id: user._id }, "your-secret-key", {
      expiresIn: "30d",
    });

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      verified: user.verified,
      customerPriorityScore: user.customerPriorityScore,
      averageHoldings: user.averageHoldings,
      isActive: user.isActive,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is inactive. Please contact support." });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Update lastLogin
    user.lastLogin = new Date();

    // Recalculate priority score
    const priorityScore = await calculatePriority(user);
    user.customerPriorityScore = priorityScore;

    // Save updates
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, "your-secret-key", {
      expiresIn: "30d",
    });

    // Return detailed response
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      verified: user.verified,
      customerPriority: user.customerPriority,
      customerPriorityScore: user.customerPriorityScore,
      averageHoldings: user.averageHoldings,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get Aadhaar details by phone number (for verification)
router.get('/aadhaar/:phoneNumber', async (req, res) => {
  try {
    const aadhaar = await Aadhaar.findOne({ phoneNumber: req.params.phoneNumber });
    
    if (!aadhaar) {
      return res.status(404).json({ message: 'No Aadhaar record found for this phone number' });
    }
    
    res.json({
      aadhaarNumber: aadhaar.aadhaarNumber,
      fullName: aadhaar.fullName,
      address: aadhaar.address,
      age: aadhaar.age,
      gender: aadhaar.gender,
      fatherName: aadhaar.fatherName,
      photo: aadhaar.photo
    });
  } catch (error) {
    console.error('Get Aadhaar error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get PAN details by phone number (for verification)
router.get('/pan/:phoneNumber', async (req, res) => {
  try {
    const pan = await Pan.findOne({ phoneNumber: req.params.phoneNumber });
    
    if (!pan) {
      return res.status(404).json({ message: 'No PAN record found for this phone number' });
    }
    
    res.json({
      panNumber: pan.panNumber,
      fullName: pan.fullName,
      tax_filing_status: pan.tax_filing_status,
      income_range: pan.income_range,
      credit_score: pan.credit_score,
      spending_behavior: pan.spending_behavior,
      benchmark_data: pan.benchmark_data,
      loan_history: pan.loan_history
    });
  } catch (error) {
    console.error('Get PAN error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user facial image by ID
router.get('/face/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      faceImage: user.faceImage
    });
  } catch (error) {
    console.error('Get face image error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID (for profile)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      aadhaarDetails: {
        verified: user.aadhaarDetails?.verified,
        aadhaarNumber: user.aadhaarDetails?.aadhaarNumber?.slice(-4).padStart(12, '*')
      },
      panDetails: {
        verified: user.panDetails?.verified,
        panNumber: user.panDetails?.panNumber ? 
          `${user.panDetails.panNumber.slice(0, 2)}****${user.panDetails.panNumber.slice(-2)}` : null
      },
      address: user.address,
      gender: user.gender,
      age: user.age,
      verified: user.verified,
      customerPriority: user.customerPriority
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;