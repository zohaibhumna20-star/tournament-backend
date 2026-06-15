const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    wins:     { type: Number, default: 0 },
    kills:    { type: Number, default: 0 },
    rank:     { type: Number, default: 99 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leaderboard", leaderboardSchema);