const express = require("express")
const router = express.Router()
const Aadhaar = require("../models/aadhaarModel")
const Pan = require("../models/panModel")

// Route to add mock Aadhaar data
router.post("/add-mock-aadhaar", async (req, res) => {
  try {
    const aadhaarData = req.body

    // Check if data already exists
    const existingAadhaar = await Aadhaar.findOne({
      aadhaarNumber: aadhaarData.aadhaarNumber,
    })

    if (existingAadhaar) {
      return res.status(400).json({
        message: "Aadhaar record already exists",
      })
    }

    // Create new Aadhaar record
    const aadhaar = new Aadhaar(aadhaarData)
    await aadhaar.save()

    res.status(201).json({
      message: "Aadhaar record created successfully",
      data: aadhaar,
    })
  } catch (error) {
    console.error("Add mock Aadhaar error:", error)
    res.status(500).json({
      message: "Server error",
      error: error.message,
    })
  }
})

// Route to add mock PAN data
router.post("/add-mock-pan", async (req, res) => {
  try {
    const panData = req.body

    // Check if data already exists
    const existingPan = await Pan.findOne({
      panNumber: panData.panNumber,
    })

    if (existingPan) {
      return res.status(400).json({
        message: "PAN record already exists",
      })
    }

    // Create new PAN record
    const pan = new Pan(panData)
    await pan.save()

    res.status(201).json({
      message: "PAN record created successfully",
      data: pan,
    })
  } catch (error) {
    console.error("Add mock PAN error:", error)
    res.status(500).json({
      message: "Server error",
      error: error.message,
    })
  }
})

// Route to add both Aadhaar and PAN data in one go
router.post("/add-mock-data", async (req, res) => {
  try {
    const { aadhaarData, panData } = req.body

    // Check if Aadhaar data already exists
    const existingAadhaar = await Aadhaar.findOne({
      aadhaarNumber: aadhaarData.aadhaarNumber,
    })

    if (existingAadhaar) {
      return res.status(400).json({
        message: "Aadhaar record already exists",
      })
    }

    // Check if PAN data already exists
    const existingPan = await Pan.findOne({
      panNumber: panData.panNumber,
    })

    if (existingPan) {
      return res.status(400).json({
        message: "PAN record already exists",
      })
    }

    // Create new records
    const aadhaar = new Aadhaar(aadhaarData)
    const pan = new Pan(panData)

    await aadhaar.save()
    await pan.save()

    res.status(201).json({
      message: "Mock data added successfully",
      aadhaar: aadhaar,
      pan: pan,
    })
  } catch (error) {
    console.error("Add mock data error:", error)
    res.status(500).json({
      message: "Server error",
      error: error.message,
    })
  }
})

// Route to add multiple records at once
router.post("/add-bulk-mock-data", async (req, res) => {
  try {
    const { aadhaarRecords, panRecords } = req.body

    const aadhaarResults = []
    const panResults = []

    // Add Aadhaar records
    if (aadhaarRecords && aadhaarRecords.length > 0) {
      for (const record of aadhaarRecords) {
        try {
          const existingAadhaar = await Aadhaar.findOne({
            aadhaarNumber: record.aadhaarNumber,
          })

          if (!existingAadhaar) {
            const aadhaar = new Aadhaar(record)
            await aadhaar.save()
            aadhaarResults.push({
              status: "success",
              aadhaarNumber: record.aadhaarNumber,
            })
          } else {
            aadhaarResults.push({
              status: "skipped",
              aadhaarNumber: record.aadhaarNumber,
              reason: "Already exists",
            })
          }
        } catch (err) {
          aadhaarResults.push({
            status: "error",
            aadhaarNumber: record.aadhaarNumber,
            error: err.message,
          })
        }
      }
    }

    // Add PAN records
    if (panRecords && panRecords.length > 0) {
      for (const record of panRecords) {
        try {
          const existingPan = await Pan.findOne({
            panNumber: record.panNumber,
          })

          if (!existingPan) {
            const pan = new Pan(record)
            await pan.save()
            panResults.push({
              status: "success",
              panNumber: record.panNumber,
            })
          } else {
            panResults.push({
              status: "skipped",
              panNumber: record.panNumber,
              reason: "Already exists",
            })
          }
        } catch (err) {
          panResults.push({
            status: "error",
            panNumber: record.panNumber,
            error: err.message,
          })
        }
      }
    }

    res.status(200).json({
      message: "Bulk data import completed",
      aadhaarResults,
      panResults,
    })
  } catch (error) {
    console.error("Add bulk mock data error:", error)
    res.status(500).json({
      message: "Server error",
      error: error.message,
    })
  }
})

module.exports = router

