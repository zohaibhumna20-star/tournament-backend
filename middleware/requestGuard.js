// ✅ FIX #3: Replay Attack Prevention
// Har sensitive request ke saath client X-Request-ID aur X-Timestamp header bhejega

const processedRequests = new Map(); // Production: Redis use karo

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

const requestGuard = (req, res, next) => {
  const requestId = req.headers["x-request-id"];
  const timestamp = req.headers["x-timestamp"];

  // ✅ Headers missing — block
  if (!requestId || !timestamp) {
    return res.status(400).json({
      success: false,
      message: "Missing request headers: X-Request-ID and X-Timestamp required",
    });
  }

  const reqTime = parseInt(timestamp, 10);
  const now = Date.now();

  // ✅ Timestamp too old or future — block
  if (isNaN(reqTime) || Math.abs(now - reqTime) > TIMESTAMP_TOLERANCE_MS) {
    return res.status(400).json({
      success: false,
      message: "Request timestamp invalid or expired",
    });
  }

  // ✅ Duplicate request ID — replay attack
  if (processedRequests.has(requestId)) {
    return res.status(409).json({
      success: false,
      message: "Duplicate request detected",
    });
  }

  // ✅ Mark as processed (TTL: 10 minutes)
  processedRequests.set(requestId, now);
  setTimeout(() => processedRequests.delete(requestId), 10 * 60 * 1000);

  next();
};

module.exports = requestGuard;