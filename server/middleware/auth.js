const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use environment variable or fallback for consistency
    const secret = process.env.JWT_SECRET || "superGK108";

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

module.exports = { auth, authorize };
