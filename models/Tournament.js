const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const TournamentSchema = new mongoose.Schema(
  {
    tournamentID: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    name: { type: String, required: true },

    description: {
      type: String,
      default: null,
    },

    category: {
      type: String,
      enum: ["SURVIVAL", "CLASH SQUAD", "PERKILL", "BERMUDA"],
      required: true,
    },

    type: {
      type: String,
      enum: ["SURVIVAL", "CLASH SQUAD", "PERKILL", "BERMUDA"],
      required: true,
    },

    subType: {
      type: String,
      enum: ["NONE", "1V1", "2V2", "4V4", "DUO", "BERMUDA"],
      default: "NONE",
    },

    // FREE / PAID
    tournamentType: {
      type: String,
      enum: ["PAID", "FREE"],
      default: "PAID",
    },

    // ✅ FREE tournament join password (set by admin at creation)
    joinPassword: {
      type: String,
      default: null,
    },

    // kept for backward compat
    joinCode: {
      type: String,
      default: null,
      sparse: true,
    },

    entryFee:     { type: Number, default: 0 },
    prizePool:    { type: Number, default: 0 },
    maxPlayers:   { type: Number, required: true },
    joinedPlayers:{ type: Number, default: 0 },

    date: { type: String },
    time: { type: String },

    image: { type: String, default: null },

    perKillRate: { type: Number, default: 0 },

    joinedUsers: [
      {
        userId:     { type: String },
        seatNumber: { type: Number },
      },
    ],

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    roomId:         { type: String, default: null },
    roomPassword:   { type: String, default: null },
    roomAssignedAt: { type: Date,   default: null },

    roomStatus: {
      type: String,
      enum: ["not_assigned", "assigned"],
      default: "not_assigned",
    },

    // ✅ NOTIFICATION FLAGS — prevent duplicate sends
    notifHalfSlots: { type: Boolean, default: false },
    notifLastSlots: { type: Boolean, default: false },
    notif15Min:     { type: Boolean, default: false },
    notif5Min:      { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

TournamentSchema.index({ joinCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Tournament", TournamentSchema);