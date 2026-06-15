const Support = require("../models/supportModel");

// GET WhatsApp number
// GET /api/support/whatsapp
const getWhatsAppNumber = async (req, res) => {
  try {
    // صرف ایک document ہوگا — نہ ہو تو default بناؤ
    let support = await Support.findOne();

    if (!support) {
      support = await Support.create({ whatsappNumber: "923247240918" });
    }

    return res.status(200).json({
      success:         true,
      whatsappNumber:  support.whatsappNumber,
    });
  } catch (error) {
    console.error("getWhatsAppNumber error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// UPDATE WhatsApp number (Admin only)
// PUT /api/support/whatsapp
const updateWhatsAppNumber = async (req, res) => {
  try {
    const { whatsappNumber } = req.body;

    if (!whatsappNumber || whatsappNumber.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "whatsappNumber is required",
      });
    }

    // صرف digits allow کرو
    const clean = whatsappNumber.replace(/\D/g, "");
    if (clean.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    let support = await Support.findOne();

    if (!support) {
      support = await Support.create({ whatsappNumber: clean });
    } else {
      support.whatsappNumber = clean;
      await support.save();
    }

    return res.status(200).json({
      success:        true,
      message:        "WhatsApp number updated",
      whatsappNumber: support.whatsappNumber,
    });
  } catch (error) {
    console.error("updateWhatsAppNumber error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = { getWhatsAppNumber, updateWhatsAppNumber };