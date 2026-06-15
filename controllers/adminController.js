const User = require("../models/User");
const mongoose = require("mongoose");

// 🔍 SEARCH USER
exports.searchUser = async (req, res) => {
  try {
    const { query } = req.body;

    const searchConditions = [
      { email: { $regex: query, $options: "i" } },
    ];

    // ✅ Safe ObjectId check
    if (mongoose.Types.ObjectId.isValid(query)) {
      searchConditions.push({ _id: query });
    }

    const users = await User.find({
      $or: searchConditions,
    }).limit(10);

    // ✅ Return empty array (NO crash)
    if (!users.length) {
      return res.json([]);
    }

    const result = users.map((user) => ({
      id: user._id,
      name: user.username,
      email: user.email,
      coins: user.coins,
    }))

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 💰 ADD BALANCE
exports.addBalance = async (req, res) => {
  try {
    const { userID, amount } = req.body;

    const user = await User.findById(userID);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Safe number conversion
    const addAmount = Number(amount);

  if (!Number.isFinite(addAmount) || addAmount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }
    user.deposit += addAmount;
    user.coins += addAmount;
    await user.save();

    res.json({
      message: "Deposit added successfully",
      coins: user.coins,
      deposit: user.deposit,
      winning: user.winning,
      bonus: user.bonus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};