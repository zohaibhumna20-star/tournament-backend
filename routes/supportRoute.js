const express    = require("express");
const router     = express.Router();
const {
  getWhatsAppNumber,
  updateWhatsAppNumber,
} = require("../controllers/supportController");

// GET  /api/support/whatsapp  — سب users access کر سکتے ہیں
router.get("/whatsapp", getWhatsAppNumber);

// PUT  /api/support/whatsapp  — Admin only (آگے auth middleware لگا سکتے ہو)
router.put("/whatsapp", updateWhatsAppNumber);

module.exports = router;