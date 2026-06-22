const Withdraw = require("../models/withdraw_model");
const User = require("../models/User");
const sendResponse = require("../utils/response_handler");

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

    if (!amount || amount < 50) {
      return sendResponse(res, 400, false, "Minimum withdrawal amount is 50 PKR");
    }

    const withdrawable = (user.deposit ?? 0) + (user.winning ?? 0);

    if (amount > withdrawable) {
      return sendResponse(res, 400, false, "Insufficient balance");
    }

    // ✅ FIX #2 — پہلے Withdraw object بناؤ اور validate کرو
    const withdraw = new Withdraw({
      userId: user._id,
      userName: user.username,
      email: user.email,
      accountName,
      accountNumber,
      method,
      amount,
      status: "pending",
    });

    // ✅ یہ enum check کرے گا — اگر "Easypaisa" آیا تو یہاں fail ہوگا
    // balance cut سے پہلے — کوئی نقصان نہیں
    await withdraw.validate();

    // ✅ Validate pass ہوا تو اب balance cut کرو
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
    await withdraw.save();

    return sendResponse(res, 201, true, "Withdraw request submitted", withdraw);
  } catch (error) {
    // ✅ FIX #3 — real error message
    console.error("createWithdraw error:", error.message);
    return sendResponse(res, 500, false, error.message || "Server Error");
  }
};

// باقی سب functions same رہیں گے
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

const approveWithdraw = async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);
    if (!withdraw) return sendResponse(res, 404, false, "Withdraw not found");
    if (withdraw.status !== "pending") return sendResponse(res, 400, false, "Request already processed");
    withdraw.status = "approved";
    await withdraw.save();
    return sendResponse(res, 200, true, "Withdraw approved", withdraw);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

const rejectWithdraw = async (req, res) => {
  try {
    const withdraw = await Withdraw.findById(req.params.id);
    if (!withdraw) return sendResponse(res, 404, false, "Withdraw not found");
    if (withdraw.status !== "pending") return sendResponse(res, 400, false, "Request already processed");
    const user = await User.findOne({ email: withdraw.email });
    if (user) {
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

const getUserWithdrawHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await Withdraw.find({ userId }).sort({ createdAt: -1 }).lean();
    return sendResponse(res, 200, true, "Withdraw history", history);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

const getMyWithdrawHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const user = await User.findOne({ email: req.user.email });
    if (!user) return sendResponse(res, 404, false, "User not found");
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