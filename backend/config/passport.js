// File: config/passport.js
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Store users in memory (use a database in production)
const users = {};

// OAuth credentials
const GOOGLE_CLIENT_ID = "511885505497-kq6nj3s5gv39ts4uodf6p1gsfbhpre8r.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";


module.exports = function(passport) {
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser((id, done) => {
    done(null, users[id]);
  });

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:5000/auth/callback",
        accessType: "offline",
        prompt: "consent",
      },
      (accessToken, refreshToken, profile, done) => {
        console.log("✅ Access Token:", accessToken);
        console.log("✅ Refresh Token:", refreshToken || "⚠️ No refresh token received!");

        if (!refreshToken) {
          console.error("❌ No refresh token received! Try removing Google permissions and re-authenticating.");
        }

        users[profile.id] = {
          id: profile.id,
          accessToken,
          refreshToken,
          name: profile.displayName,
          email: profile.emails[0].value,
        };

        return done(null, users[profile.id]);
      }
    )
  );

  return users;
};