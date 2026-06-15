const express = require("express");
const router = express.Router();

const {
  getReferralInfo,
  applyReferral,
} = require("../controllers/referral_controller");

const { protect } = require("../middleware/authMiddleware");

// Get referral info for a user
router.get("/:userId", protect, getReferralInfo);

// Apply referral code (called on signup)
router.post("/apply", applyReferral);

module.exports = router;