const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const mongoose = require("mongoose");

// ================= ADD COINS =================
exports.addCoins = async (req, res) => {
  // ✅ FIX #1: req.body.userID remove — req.user._id use karo (set by protect middleware)
  const userID = req.user._id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  // ✅ FIX #4: MongoDB session for atomic transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userID).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    const before = { coins: user.coins, deposit: user.deposit };

    // ✅ FIX #4: Atomic update
    user.coins   = (user.coins   || 0) + amount;
    user.deposit = (user.deposit || 0) + amount;
    await user.save({ session });

    const transaction = new Transaction({
      userID,
      amount,
      type: "deposit",
      status: "completed",
    });
    await transaction.save({ session });

    // ✅ FIX #7: Audit log
    await AuditLog.create([{
      userId:     userID,
      action:     "DEPOSIT",
      amount,
      targetId:   transaction._id.toString(),
      targetType: "Transaction",
      before,
      after:  { coins: user.coins, deposit: user.deposit },
      ip:     req.ip,
      status: "success",
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Coins added successfully",
      data: {
        coins:        user.coins,
        deposit:      user.deposit,
        winning:      user.winning || 0,
        bonus:        user.bonus   || 0,
        totalBalance: (user.deposit || 0) + (user.winning || 0) + (user.bonus || 0),
      },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= WITHDRAW COINS =================
exports.withdrawCoins = async (req, res) => {
  // ✅ FIX #1: req.body.userID remove — req.user._id use karo
  const userID = req.user._id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  // ✅ FIX #4: MongoDB session for atomic transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userID).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    user.deposit = user.deposit || 0;
    user.winning = user.winning || 0;
    user.bonus   = user.bonus   || 0;

    const totalBalance = user.deposit + user.winning + user.bonus;

    if (totalBalance < amount) {
      await session.abortTransaction();
      session.endSession();

      // ✅ FIX #7: Log failed attempt
      await AuditLog.create({
        userId: userID,
        action: "WITHDRAW",
        amount,
        status: "failed",
        meta:   { reason: "Insufficient balance", totalBalance },
        ip:     req.ip,
      });

      return res.status(400).json({ message: "Insufficient balance" });
    }

    const before = {
      deposit: user.deposit,
      winning: user.winning,
      bonus:   user.bonus,
    };

    // ✅ Same deduction logic — winning first, deposit second, bonus last
    let remaining = amount;

    const win = Math.min(user.winning, remaining);
    user.winning -= win;
    remaining    -= win;

    const dep = Math.min(user.deposit, remaining);
    user.deposit -= dep;
    remaining    -= dep;

    const bon = Math.min(user.bonus, remaining);
    user.bonus -= bon;
    remaining  -= bon;

    await user.save({ session });

    const transaction = new Transaction({
      userID,
      amount,
      type:   "withdraw",
      status: "pending",
    });
    await transaction.save({ session });

    // ✅ FIX #7: Audit log
    await AuditLog.create([{
      userId:     userID,
      action:     "WITHDRAW",
      amount,
      targetId:   transaction._id.toString(),
      targetType: "Transaction",
      before,
      after: {
        deposit: user.deposit,
        winning: user.winning,
        bonus:   user.bonus,
      },
      ip:     req.ip,
      status: "success",
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Withdraw successful",
      data: {
        deposit:      user.deposit,
        winning:      user.winning,
        bonus:        user.bonus,
        totalBalance: user.deposit + user.winning + user.bonus,
      },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================= TRANSACTION HISTORY =================
exports.getTransactions = async (req, res) => {
  try {
    // ✅ FIX #1: Sirf apni transactions — req.user._id se match karo
    const userID = req.user._id;

    const transactions = await Transaction.find({ userID });

    res.json({ success: true, transactions });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};