// File: routes/refresh.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// OAuth credentials
const GOOGLE_CLIENT_ID = "511885505497-kq6nj3s5gv39ts4uodf6p1gsfbhpre8r.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

// Refresh Access Token Using Refresh Token
router.get("/", async (req, res) => {
  const users = req.app.locals.users;
  const userId = Object.keys(users)[0]; // Assume first user
  const user = users[userId];

  if (!user || !user.refreshToken) {
    return res.status(400).json({ error: "❌ No refresh token found! Please re-authenticate." });
  }

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: user.refreshToken,
        grant_type: "refresh_token",
      },
    });

    user.accessToken = response.data.access_token; // Update the access token
    console.log("✅ New Access Token:", user.accessToken);

    res.json({ accessToken: user.accessToken });
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

module.exports = router;