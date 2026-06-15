const express = require("express");
const router = express.Router();
const { adminLogin } = require("../controllers/admin.auth.controller");

// ✅ Sirf login route — create route hata diya
router.post("/login", adminLogin);

module.exports = router;