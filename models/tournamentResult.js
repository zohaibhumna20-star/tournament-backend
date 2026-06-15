const mongoose = require("mongoose");

const TournamentResultSchema = new mongoose.Schema({
  // ✅ FIX: String type — frontend string ID se match ho
  tournamentId: {
    type:     String,
    required: true,
    index:    true,
  },
  winners: [
    {
      position: { type: Number, required: true, min: 1 },
      userId:   { type: String, required: true, trim: true },
      username: { type: String, required: true, trim: true },
      prize:    { type: Number, required: true, default: 0, min: 0 },
      // ✅ FIX: kills field add kiya — result view mein show hoga
      kills:    { type: Number, default: 0 },
    }
  ],
  resultImage: { type: String, default: null },
  verified:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model("TournamentResult", TournamentResultSchema);