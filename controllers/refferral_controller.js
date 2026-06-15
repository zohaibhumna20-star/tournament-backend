const User = require("../models/User");

// ================= GET REFERRAL INFO =================
exports.getReferralInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Count total referred users
    const referredUsers = await User.find({
      referredBy: user.referralCode,
    }).select("username createdAt");

    // Count referrals in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReferrals = referredUsers.filter(
      (u) => new Date(u.createdAt) >= last24Hours
    );

    return res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals: referredUsers.length,
      recentReferrals: recentReferrals.length,
      referredUsers: referredUsers.map((u) => ({
        username: u.username,
        joinedAt: u.createdAt,
      })),
      progress: {
        current: recentReferrals.length % 5,
        target: 5,
        cyclesCompleted: Math.floor(recentReferrals.length / 5),
      },
      bonus: user.bonus || 0,
    });
  } catch (error) {
    console.error("getReferralInfo error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= APPLY REFERRAL ON SIGNUP =================
exports.applyReferral = async (req, res) => {
  try {
    const { referralCode, newUserId } = req.body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({
        success: false,
        message: "Referral code and new user ID are required",
      });
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // Find new user
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      return res.status(404).json({
        success: false,
        message: "New user not found",
      });
    }

    // Prevent self-referral
    if (referrer._id.toString() === newUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot refer yourself",
      });
    }

    // Prevent duplicate referral
    if (newUser.referredBy) {
      return res.status(400).json({
        success: false,
        message: "User already has a referral",
      });
    }

    // Mark new user as referred
    newUser.referredBy = referralCode;
    await newUser.save();

    // Count referrer's referrals in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await User.countDocuments({
      referredBy: referralCode,
      createdAt: { $gte: last24Hours },
    });

    // Check if this completes a group of 5
    if (recentCount % 5 === 0) {
      // 5 referrals in 24 hours = Rs 50, otherwise = Rs 30
      const bonusAmount = recentCount <= 5 ? 50 : 30;
      referrer.bonus = (referrer.bonus || 0) + bonusAmount;
      await referrer.save();

      return res.status(200).json({
        success: true,
        message: `Referral applied! Referrer earned Rs ${bonusAmount} bonus`,
        bonusEarned: bonusAmount,
        referrerBonus: referrer.bonus,
        progress: {
          current: 0,
          target: 5,
          completed: true,
        },
      });
    }

    await referrer.save();

    const remaining = 5 - (recentCount % 5);

    return res.status(200).json({
      success: true,
      message: "Referral applied successfully",
      bonusEarned: 0,
      progress: {
        current: recentCount % 5,
        target: 5,
        remaining: remaining,
        completed: false,
      },
    });
  } catch (error) {
    console.error("applyReferral error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};