const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  freefireId: { type: String, required: true },

  isAdmin: { type: Boolean, default: false },

  coins: { type: Number, default: 0 },
  deposit: { type: Number, default: 0 },
  winning: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },

  balance: { type: Number, default: 0 },

  totalMatches: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },

  coinWin: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },

  level: { type: Number, default: 1 },
  stars: { type: Number, default: 0 },
  category: { type: String, default: "Bronze" },

  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },

  userID: { type: String, sparse: true },

  fcmToken: { type: String, default: "" },
  fcmTokens: [{ type: String }],

}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);