const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

// ─── Helper: generate referral code ─────────────────────────────────────────
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8);
}

// ════════════════════════════════════════════════════════════════════════════
// POST /auth/signup
// body: { username, email, freefireId, password, confirmPassword }
// ════════════════════════════════════════════════════════════════════════════
exports.signupUser = async (req, res) => {
  console.log("🚀🚀 signupUser CONTROLLER HIT");
  console.log("📦 REQUEST BODY:", req.body);
  try {
    const { username, email, freefireId, password, confirmPassword } = req.body;

    if (!username || !email || !freefireId || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      freefireId,
      password: hashedPassword,
      coins:    0,
      deposit:  0,
      winning:  0,
      bonus:    0,
      referralCode: generateReferralCode(),
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, userName: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      data: {
        userID:       user._id,
        name:         user.username,
        email:        user.email,
        freefireId:   user.freefireId,
        coins:        user.coins,
        deposit:      user.deposit,
        winning:      user.winning,
        bonus:        user.bonus,
        referralCode: user.referralCode,
        totalBalance: user.deposit + user.winning + user.bonus,
      },
    });

  } catch (error) {
    console.error("signupUser error:", error);
    console.error(error);
  console.error(error.stack);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// POST /auth/login
// body: { email, password }
// ════════════════════════════════════════════════════════════════════════════
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      { id: user._id, userName: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ SENDING RESPONSE TO FRONTEND");

    return res.json({
      success: true,
      message: "Login successful",
      token,
      data: {
        userID:       user._id,
        name:         user.username,
        email:        user.email,
        freefireId:   user.freefireId,
        coins:        user.coins,
        deposit:      user.deposit,
        winning:      user.winning,
        bonus:        user.bonus,
        totalBalance: user.deposit + user.winning + user.bonus,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// POST /auth/save-fcm-token
// body: { userId, fcmToken }
// ════════════════════════════════════════════════════════════════════════════
exports.saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "userId and fcmToken required",
      });
    }
    await User.findByIdAndUpdate(userId, {
      $set:      { fcmToken },
      $addToSet: { fcmTokens: fcmToken },
    });
    res.json({ success: true, message: "FCM token saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};