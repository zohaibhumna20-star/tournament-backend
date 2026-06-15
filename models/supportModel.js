const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema(
  {
    whatsappNumber: {
      type:    String,
      default: "923247240918",
      trim:    true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Support", supportSchema);