// File: routes/meet.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Generate Google Meet Link
// Generate Google Meet Link
router.get("/", async (req, res) => {
    const users = req.app.locals.users;
    const userId = Object.keys(users)[0]; // Assume first user
    const user = users[userId];
  
    if (!user || !user.accessToken) {
      return res.status(401).json({ error: "❌ User not authenticated or missing access token!" });
    }
  
    try {
      // Extract date and time from query parameters, with defaults
      const { date, time } = req.query;
      
      let startDateTime;
      let endDateTime;
  
      if (date && time) {
        // Assuming date is in YYYY-MM-DD format and time is in HH:MM format (24-hour)
        startDateTime = new Date(`${date}T${time}:00+05:30`); // Adjust for Asia/Kolkata timezone
        if (isNaN(startDateTime.getTime())) {
          return res.status(400).json({ error: "Invalid date or time format" });
        }
        endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // Default 30-minute duration
      } else {
        // Default to now + 30 minutes if date/time not provided
        startDateTime = new Date();
        endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
      }
  
      const event = {
        summary: "Google Meet Meeting",
        description: "This is a scheduled Google Meet meeting for ticket resolution.",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        conferenceData: {
          createRequest: {
            requestId: "meeting-" + new Date().getTime(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };
  
      const response = await axios.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        event,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      const meetLink = response.data.conferenceData.entryPoints[0].uri;
      console.log("✅ Google Meet Link:", meetLink);
      res.json({ meetLink });
    } catch (error) {
      console.error("❌ Error creating Google Meet:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create Google Meet" });
    }
  });

module.exports = router;