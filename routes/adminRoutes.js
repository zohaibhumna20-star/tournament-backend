const express  = require("express");
const router   = express.Router();
const User     = require("../models/User");
const Withdraw = require("../models/withdraw_model");
const Deposit  = require("../models/deposit_model");
const mongoose = require("mongoose");

// ── ALL DEPOSITS (ADMIN LIST) ──────────────────────────────────────────────
router.get("/all-deposits", async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    const result = deposits.map((d) => ({
      _id:           d._id,
      userId:        d.user?._id?.toString() || "",
      userName:      d.user?.username        || "Unknown",
      email:         d.user?.email           || "Unknown",
      accountNumber: d.userTillId            || "N/A",
      accountName:   d.userTillId            || "N/A",
      method:        d.paymentMethod         || "N/A",
      amount:        d.amount                || 0,
      status:        d.status                || "pending",
      note:          d.note                  || "",
      createdAt:     d.createdAt,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── APPROVE DEPOSIT ────────────────────────────────────────────────────────
router.put("/deposit/:id/approve", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate(
      "user", "username email deposit coins"
    );

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Deposit already processed",
      });
    }

    deposit.status = "approved";
    await deposit.save();

    const user = await User.findById(deposit.user._id);
    if (user) {
      user.deposit += deposit.amount;
      user.coins   += deposit.amount;
      await user.save();
    }

    res.json({
      success:    true,
      message:    "Deposit approved",
      newBalance: user?.coins || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ FIX: console.log("🔥 APPROVE ROUTE HIT") HATA DIYA
// Ye top-level pe tha — require() hote hi execute hota tha
// Server startup pe hang ka ek reason yahi tha

// ── REJECT DEPOSIT ─────────────────────────────────────────────────────────
router.put("/deposit/:id/reject", async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Deposit already processed",
      });
    }

    deposit.status = "rejected";
    await deposit.save();

    res.json({ success: true, message: "Deposit rejected" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── USER FINANCIAL STATS ───────────────────────────────────────────────────
router.get("/user-stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const approvedWithdraws = await Withdraw.find({
      userId: userObjectId,
      status: "approved",
    });

    const totalWithdraw = approvedWithdraws.reduce(
      (sum, w) => sum + (w.amount || 0), 0
    );

    res.json({
      totalDeposit:  user.deposit || 0,
      totalWinning:  user.winning || 0,
      totalBonus:    user.bonus   || 0,
      totalWithdraw: totalWithdraw,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── USER DEPOSIT HISTORY ───────────────────────────────────────────────────
router.get("/user-deposits/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const deposits = await Deposit.find({ user: userObjectId })
      .sort({ createdAt: -1 });

    const result = deposits.map((d) => ({
      _id:           d._id,
      userName:      user.username    || "",
      email:         user.email       || "",
      accountNumber: d.userTillId     || "N/A",
      method:        d.paymentMethod  || "N/A",
      amount:        d.amount         || 0,
      status:        d.status         || "pending",
      createdAt:     d.createdAt,
    }));

    return res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── USER WITHDRAW HISTORY ──────────────────────────────────────────────────
router.get("/user-withdrawals/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const withdrawals = await Withdraw.find({ userId: userObjectId })
      .sort({ createdAt: -1 });

    const result = withdrawals.map((w) => ({
      _id:           w._id,
      userName:      w.userName      || "",
      email:         w.email         || "",
      accountNumber: w.accountNumber || "N/A",
      method:        w.method        || "N/A",
      amount:        w.amount        || 0,
      status:        w.status        || "pending",
      createdAt:     w.createdAt,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── UPDATE STATS ───────────────────────────────────────────────────────────
router.post("/update-stats/:userId", async (req, res) => {
  const { userId } = req.params;
  const { totalMatches, matchesWon, totalKills, coinWin } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.totalMatches = totalMatches ?? user.totalMatches;
    user.matchesWon   = matchesWon   ?? user.matchesWon;
    user.totalKills   = totalKills   ?? user.totalKills;
    user.coinWin      = coinWin      ?? user.coinWin;

    await user.save();
    res.json({ message: "Stats updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;