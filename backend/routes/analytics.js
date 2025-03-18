const express = require('express');
const router = express.Router();
const Ticket = require('../models/ticket'); // Adjust path as needed
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Create a report schema and model
const reportSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  insights: [{ 
    type: { type: String, enum: ['branch', 'staff', 'systemic', 'success'], required: true }, 
    content: { type: String, required: true } 
  }]
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

// Update the FAQ schema to include PDF storage
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  frequency: { type: Number, required: true },
  domain: { type: String, required: true },
  answer: { type: String, required: true },
  metadata: {
    source: String,
    lastUpdated: Date
  },
  filename: String,
  filepath: String
}, { timestamps: true });

const FAQ = mongoose.model('FAQ', faqSchema);

// Add FAQ Report schema
const faqReportSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  faqs: [{
    question: String,
    frequency: Number,
    domain: String,
    answer: String,
    metadata: {
      source: String,
      lastUpdated: Date
    }
  }]
}, { timestamps: true });

const FAQReport = mongoose.model('FAQReport', faqReportSchema);

// Get all reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 }).lean();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ 
      message: 'Failed to fetch reports',
      error: error.message 
    });
  }
});

// Save a new report
router.post('/reports', async (req, res) => {
  try {
    const { filename, insights, pdfData } = req.body;
    
    if (!filename || !insights || !Array.isArray(insights) || !pdfData) {
      return res.status(400).json({ message: 'Invalid report data' });
    }

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'reports'); // Fix path
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true }); // Add recursive option
    }

    // Clean the filename to prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const filepath = path.join(reportsDir, safeFilename);

    try {
      // Extract base64 data correctly
      const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      // Write file synchronously
      fs.writeFileSync(filepath, pdfBuffer);
      console.log('PDF saved successfully at:', filepath);

      const report = new Report({
        filename: safeFilename,
        filepath, // Save the full path
        insights,
        timestamp: new Date()
      });

      await report.save();
      res.status(201).json(report);
    } catch (writeError) {
      console.error('Error writing PDF:', writeError);
      throw new Error('Failed to save PDF file');
    }
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ 
      message: 'Failed to save report',
      error: error.message 
    });
  }
});

// Get a specific report by ID
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ 
      message: 'Failed to fetch report',
      error: error.message 
    });
  }
});

// Add these new endpoints for FAQs
router.post('/faq', async (req, res) => {
  try {
    const faqs = req.body;
    if (!Array.isArray(faqs)) {
      return res.status(400).json({ message: 'Invalid FAQ data format' });
    }

    // Save all FAQs
    await FAQ.deleteMany({}); // Clear old FAQs
    const savedFAQs = await FAQ.insertMany(faqs);
    res.status(201).json(savedFAQs);
  } catch (error) {
    console.error('Error saving FAQs:', error);
    res.status(500).json({ 
      message: 'Failed to save FAQs',
      error: error.message 
    });
  }
});

// Modify the existing FAQ GET endpoint
router.get('/faq', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ frequency: -1 }).lean();
    if (faqs.length === 0) {
      // If no FAQs in database, generate mock ones
      return res.json(generateMockFAQs());
    }
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch FAQs',
      error: error.message 
    });
  }
});

// Add endpoint to download report PDF
router.get('/reports/download/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if file exists
    if (!fs.existsSync(report.filepath)) {
      console.error('File not found:', report.filepath);
      return res.status(404).json({ message: 'Report file not found' });
    }

    // Send file with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    
    // Stream the file instead of loading it all at once
    const fileStream = fs.createReadStream(report.filepath);
    fileStream.pipe(res);
    
    // Handle streaming errors
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ 
      message: 'Failed to download report',
      error: error.message 
    });
  }
});

// Add endpoint to get FAQ reports
router.get('/faq/reports', async (req, res) => {
  try {
    const reports = await FAQReport.find().sort({ timestamp: -1 }).lean();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching FAQ reports:', error);
    res.status(500).json({ 
      message: 'Failed to fetch FAQ reports',
      error: error.message 
    });
  }
});

// Update the FAQ generation endpoint to save reports
router.post('/faq/generate', async (req, res) => {
  try {
    const { faqs, filename, pdfData } = req.body;
    
    if (!Array.isArray(faqs) || !filename || !pdfData) {
      return res.status(400).json({ 
        message: 'Invalid FAQ data format',
        faqs: generateMockFAQs()
      });
    }

    // Create FAQs directory if it doesn't exist
    const faqsDir = path.join(__dirname, '..', 'faqs');
    if (!fs.existsSync(faqsDir)) {
      fs.mkdirSync(faqsDir, { recursive: true });
    }

    // Clean the filename to prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const filepath = path.join(faqsDir, safeFilename);

    try {
      // Extract base64 data correctly
      const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      
      // Write file synchronously
      fs.writeFileSync(filepath, pdfBuffer);
      console.log('FAQ PDF saved successfully at:', filepath);

      // Save FAQ report
      const faqReport = new FAQReport({
        filename: safeFilename,
        filepath,
        faqs,
        timestamp: new Date()
      });

      await faqReport.save();

      // Save current FAQs to FAQ collection
      await FAQ.deleteMany({}); // Clear existing FAQs
      const savedFAQs = await FAQ.insertMany(faqs);

      res.json({
        message: 'FAQs generated and saved successfully',
        faqs: savedFAQs,
        report: faqReport
      });
    } catch (writeError) {
      console.error('Error writing FAQ PDF:', writeError);
      throw new Error('Failed to save FAQ PDF file');
    }
  } catch (error) {
    console.error('Error generating FAQs:', error);
    res.status(500).json({ 
      message: 'Failed to generate FAQs',
      error: error.message,
      faqs: generateMockFAQs()
    });
  }
});

// Add endpoint to download FAQ report
router.get('/faq/reports/download/:id', async (req, res) => {
  try {
    const report = await FAQReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'FAQ report not found' });
    }

    if (!fs.existsSync(report.filepath)) {
      console.error('File not found:', report.filepath);
      return res.status(404).json({ message: 'FAQ report file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    
    const fileStream = fs.createReadStream(report.filepath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Error downloading FAQ report:', error);
    res.status(500).json({ 
      message: 'Failed to download FAQ report',
      error: error.message 
    });
  }
});

// Helper function to format description as question
function formatAsQuestion(description) {
  description = description.trim();
  
  // If it's already a question, return as is
  if (description.endsWith('?')) {
    return description;
  }

  // Convert statement to question
  if (description.toLowerCase().startsWith('how') || 
      description.toLowerCase().startsWith('what') || 
      description.toLowerCase().startsWith('why') ||
      description.toLowerCase().startsWith('when')) {
    return description + '?';
  }

  // For other statements, prefix with appropriate question word
  if (description.toLowerCase().includes('unable to') || 
      description.toLowerCase().includes('cant') ||
      description.toLowerCase().includes("can't")) {
    return `How do I resolve: ${description}?`;
  }

  if (description.toLowerCase().includes('error') || 
      description.toLowerCase().includes('issue') ||
      description.toLowerCase().includes('problem')) {
    return `What should I do when ${description}?`;
  }

  return `How can I handle this request: ${description}?`;
}

// Helper function to generate comprehensive answer
function generateAnswer(description, resolutions) {
  let answer = '';

  if (resolutions.length > 0) {
    // Use actual resolutions if available
    answer = "Resolution Steps:\n" + Array.from(resolutions)
      .map((resolution, index) => `${index + 1}. ${resolution}`)
      .join('\n');
  } else {
    // Generate generic answer based on the description
    answer = "Standard Resolution Process:\n";
    answer += "1. Verify customer identity and account details\n";
    answer += "2. Review the specific issue: " + description + "\n";
    answer += "3. Follow department guidelines for resolution\n";
    answer += "4. Document the resolution steps taken\n";
    answer += "5. Confirm resolution with customer";
  }

  return answer;
}

function generateMockFAQs(domainData = []) {
  const defaultFAQs = [
    {
      question: "How do I reset my online banking password?",
      frequency: 45,
      domain: "Retail Banking & Customer Support",
      answer: "1. Visit the login page\n2. Click 'Forgot Password'\n3. Verify your identity using SMS or email\n4. Create a new password following security guidelines"
    },
    {
      question: "What documents are needed for a loan application?",
      frequency: 38,
      domain: "Loan & Credit Department",
      answer: "Required documents include:\n1. Valid ID\n2. Proof of income (last 3 months)\n3. Bank statements\n4. Employment verification\n5. Credit history report"
    },
    {
      question: "How long does a wire transfer take?",
      frequency: 32,
      domain: "Payments & Clearing Department",
      answer: "Domestic wire transfers typically process within 24 hours. International transfers may take 2-5 business days depending on the destination country and bank."
    }
  ];

  return defaultFAQs;
}

// Add this to your main server file:
// app.use('/api/analytics', require('./routes/analytics'));

module.exports = router;