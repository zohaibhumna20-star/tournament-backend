const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");

const {
  createWithdraw,
  getAllWithdraws,
  approveWithdraw,
  rejectWithdraw,
  getUserWithdrawHistory,
  getMyWithdrawHistory,
} = require("../controllers/withdraw_controller");

// USER REQUEST
router.post("/", protect, createWithdraw);

// USER HISTORY (logged-in user, via auth token)
router.get("/my-history", protect, getMyWithdrawHistory);

// USER HISTORY (legacy by userId param)
router.get("/history/:userId", getUserWithdrawHistory);

// ADMIN
router.get("/", getAllWithdraws);
router.put("/:id/approve", approveWithdraw);
router.put("/:id/reject", rejectWithdraw);

module.exports = router;