const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔴 FIX LINE 1
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    // 🔴 FIX LINE 2
    const token = authHeader.split(" ")[1];

    // 🔴 FIX LINE 3
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔴 FIX LINE 4 (MAIN FIX)
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};