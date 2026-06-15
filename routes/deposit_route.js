const express = require("express");
const router = express.Router();

const {
  createDeposit,
  getDepositHistory,
  getAllDeposits,
  getDailyCount,
} = require("../controllers/deposit_controller");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createDeposit);
router.get("/history", protect, getDepositHistory);
router.get("/all", protect, getAllDeposits);
router.get("/daily-count", protect, getDailyCount);

module.exports = router;