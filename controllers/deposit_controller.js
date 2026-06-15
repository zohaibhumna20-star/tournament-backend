const Deposit = require("../models/deposit_model");

// @desc    Create Deposit Request
// @route   POST /api/deposit
// @access  Private
const createDeposit = async (req, res) => {
  try {
    const { amount, userTillId, paymentMethod } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) < 50) {
      return res.status(400).json({
        success: false,
        message: "Valid amount (minimum Rs 50) is required",
      });
    }

    if (!userTillId || userTillId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Your Till ID is required",
      });
    }

    if (!paymentMethod || !["Easypaisa", "JazzCash"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment method is required (Easypaisa or JazzCash)",
      });
    }

    // DAILY LIMIT CHECK — max 5 deposit requests per user per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCount = await Deposit.countDocuments({
      user: req.user._id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (todayCount >= 5) {
      return res.status(429).json({
        success: false,
        message: "You have reached your daily deposit limit (5 requests per day).",
      });
    }

    const deposit = await Deposit.create({
      user: req.user._id,
      amount: Number(amount),
      userTillId: userTillId.trim(),
      paymentMethod: paymentMethod,
      status: "pending",
    });

    const remainingToday = 5 - (todayCount + 1);

    return res.status(201).json({
      success: true,
      message: "Deposit request submitted successfully",
      remainingRequestsToday: remainingToday,
      data: deposit,
    });

  } catch (error) {
    console.error("Create Deposit Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get User Deposit History
// @route   GET /api/deposit/history
// @access  Private
const getDepositHistory = async (req, res) => {
  try {
    const deposits = await Deposit.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    console.error("Get Deposit History Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get All Deposits (Admin)
// @route   GET /api/deposit/all
// @access  Private/Admin
const getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get Today's Deposit Count for User
// @route   GET /api/deposit/daily-count
// @access  Private
const getDailyCount = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCount = await Deposit.countDocuments({
      user: req.user._id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    return res.status(200).json({
      success: true,
      todayCount: todayCount,
      remaining: Math.max(0, 5 - todayCount),
      limitReached: todayCount >= 5,
    });
  } catch (error) {
    console.error("Get Daily Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createDeposit,
  getDepositHistory,
  getAllDeposits,
  getDailyCount,
};