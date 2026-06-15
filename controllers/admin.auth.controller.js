const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= ADMIN LOGIN =================
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    // ✅ User exist nahi karta
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    // ✅ isAdmin check — normal user kabhi login nahi kar sakta
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    // ✅ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    // ✅ Token me isAdmin: true embed karo
    const token = jwt.sign(
      {
        id: user._id,
        userName: user.username,
        email: user.email,
        isAdmin: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        userID: user._id,
        name: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });

  } catch (error) {
    // ✅ Error me bhi koi info leak nahi hogi
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};