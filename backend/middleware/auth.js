const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify("your-secret-key");
    req.customer = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    console.log("Auth error:", error);
  }
};

module.exports = auth;
