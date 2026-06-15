const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // ✅ FIX: Accept both ObjectId and String
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
  },
  source: {
    type: String,
    enum: ["tournament_win", "per_kill", "deposit", "withdraw", "bonus", "refund"],
    default: "tournament_win",
  },
  tournamentId: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["success", "pending", "failed"],
    default: "success",
  },
}, { timestamps: true });

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ tournamentId: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);