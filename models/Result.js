const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
  tournamentID: { type: String, required: true },

  userID: { type: String, required: true },

  kills: { type: Number, default: 0 },

  rank: { type: Number, default: 0 },

  prize: { type: Number, default: 0 },
});

module.exports = mongoose.model("Result", ResultSchema);