// File: routes/auth.js
const express = require("express");
const passport = require("passport");
const router = express.Router();

// Google OAuth Authentication Routes
router.get(
  "/",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/calendar"],
    accessType: "offline",
    prompt: "consent",
  })
);

router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.send("✅ Login Successful! Check console for access & refresh tokens.");
  }
);

// Logout Route
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;