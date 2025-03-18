const jwt = require("jsonwebtoken");
const employees = require("../data/employees");

const employeeAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const employee = employees.find(emp => emp.id === decoded.id);

    if (!employee) {
      return res.status(403).json({ error: "Employee access required" });
    }

    req.employee = { ...employee, ...decoded };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = employeeAuth;
