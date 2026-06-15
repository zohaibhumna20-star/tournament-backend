const express = require("express");
const router  = express.Router();
const {
  getDashboardStats,
  getLiveActivity,
} = require("../controllers/dashboard.controller");
const { adminOnly } = require("../middleware/authMiddleware");

router.get("/stats",    adminOnly, getDashboardStats);
router.get("/activity", adminOnly, getLiveActivity);

module.exports = router;