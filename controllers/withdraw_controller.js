const Withdraw = require("../models/withdraw_model");
const User = require("../models/User");
const sendResponse = require("../utils/response_handler");

// CREATE WITHDRAW
const createWithdraw = async (req, res) => {
  try {
    const { accountName, accountNumber, method, amount } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    // ✅ Minimum withdraw validation
    if (!amount || amount < 50) {
      return sendResponse(res, 400, false, "Minimum withdrawal amount is 50 PKR");
    }

    // ✅ Only deposit + winning is withdrawable (bonus excluded)
    const withdrawable = (user.deposit ?? 0) + (user.winning ?? 0);

    if (amount > withdrawable) {
      return sendResponse(res, 400, false, "Insufficient balance");
    }

    // ✅ Deduct from deposit first, then winning
    let remaining = amount;

    if (user.deposit >= remaining) {
      user.deposit -= remaining;
      remaining = 0;
    } else {
      remaining -= user.deposit;
      user.deposit = 0;
      user.winning -= remaining;
      remaining = 0;
    }

    await user.save();

    const withdraw = await Withdraw.create({
      userId: user._id,
      userName: user.username,
      email: user.email,
      accountName,
      accountNumber,
      method,
      amount,
      status: "pending",
    });

    return sendResponse(res, 201, true, "Withdraw request submitted", withdraw);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// GET ALL (ADMIN)
const getAllWithdraws = async (req, res) => {
  try {
    const withdrawals = await Withdraw.find().sort({ createdAt: -1 }).lean();

    const users = await User.find();

    const enriched = withdrawals.map(w => {
      const user = users.find(u => u.email === w.email);
      return {
        ...w,
        withdrawable: user ? (user.deposit ?? 0) + (user.winning ?? 0) : 0,
        currentBalance: user
          ? (user.deposit ?? 0) + (user.winning ?? 0) + (user.bonus ?? 0)
          : 0,
      };
    });

    return sendResponse(res, 200, true, "All withdraw requests", enriched);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// APPROVE
const approveWithdraw = async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);

    if (!withdraw) {
      return sendResponse(res, 404, false, "Withdraw not found");
    }

    if (withdraw.status !== "pending") {
      return sendResponse(res, 400, false, "Request already processed");
    }

    withdraw.status = "approved";
    await withdraw.save();

    return sendResponse(res, 200, true, "Withdraw approved", withdraw);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// REJECT + REFUND
const rejectWithdraw = async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);

    if (!withdraw) {
      return sendResponse(res, 404, false, "Withdraw not found");
    }

    if (withdraw.status !== "pending") {
      return sendResponse(res, 400, false, "Request already processed");
    }

    const user = await User.findOne({ email: withdraw.email });

    if (user) {
      // ✅ Refund back to deposit first, then winning (same priority as deduction)
      user.deposit += withdraw.amount;
      await user.save();
    }

    withdraw.status = "rejected";
    await withdraw.save();

    return sendResponse(res, 200, true, "Withdraw rejected and refunded", withdraw);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// GET HISTORY BY USER ID (legacy route)
const getUserWithdrawHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const history = await Withdraw.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(res, 200, true, "Withdraw history", history);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// ✅ NEW: GET HISTORY FOR LOGGED-IN USER (via auth token, same pattern as createWithdraw)
const getMyWithdrawHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    const history = await Withdraw.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(res, 200, true, "Withdraw history", history);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

module.exports = {
  createWithdraw,
  getAllWithdraws,
  approveWithdraw,
  rejectWithdraw,
  getUserWithdrawHistory,
  getMyWithdrawHistory,
};