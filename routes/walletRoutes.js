const express = require("express");
const router = express.Router();

const {
  addCoins,
  withdrawCoins,
  getTransactions
} = require("../controllers/walletController");


// Add Coins
router.post("/add", addCoins);

// Withdraw Coins
router.post("/withdraw", withdrawCoins);

// Transaction History
router.get("/transactions/:userID", getTransactions);

module.exports = router;