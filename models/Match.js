const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  // 🏟 Tournament / Room Info
  tournamentID: { type: String, required: true },
  roomID: { type: String },
  roomPassword: { type: String },

  // 🎮 Match Status
  status: {
    type: String,
    enum: ["waiting", "live", "finished"],
    default: "waiting",
  },

  // 👥 Players & Rankings (Added)
  players: [
    {
      userId: String, // User ID
      rank: Number    // Rank achieved in this match
    }
  ],

  processed: { type: Boolean, default: false }, // ✅ Added flag for star/level logic

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Match", MatchSchema);