const express  = require("express");
const connectDB = require("./db");
const cors     = require("cors");
const path     = require("path");
const helmet   = require("helmet");
const rateLimit = require("express-rate-limit");

const userRoutes       = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const matchRoutes      = require("./routes/matchRoutes");
const walletRoutes     = require("./routes/walletRoutes");
const apiRoutes        = require("./routes/api");
const depositRoutes    = require("./routes/deposit_route");
const withdrawRoutes   = require("./routes/withdraw_routes");
const adminAuthRoutes  = require("./routes/admin.auth.routes");
const dashboardRoutes  = require("./routes/dashboard.routes");
const supportRoute     = require("./routes/supportRoute");

const { protect }        = require("./middleware/authMiddleware");
const requestGuard       = require("./middleware/requestGuard");
//const { checkFraud }     = require("./middleware/fraudDetection");
//const { validateRequest, schemas } = require("./middleware/validateRequest");

const { startNotificationCron } = require("./cron/notificationCron");

const app = express();

// ─── DB ───────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    console.log("✅ Database connection successful");
    startNotificationCron();
  })
  .catch((err) => console.error("❌ Database connection error:", err));

// ─── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         "*",
  methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-Timestamp", "X-Device-ID"],
  credentials:    true,
}));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Timestamp, X-Device-ID");
    return res.sendStatus(204);
  }
  next();
});

// ─── SECURITY ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: "10kb" })); // ✅ payload size limit

// ✅ Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests" },
});
app.use(globalLimiter);

// ✅ Stricter limiter for wallet endpoints
const walletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max:      20,
  message:  { success: false, message: "Too many wallet requests" },
});

// ✅ Stricter limiter for join endpoints
const joinLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many join requests" },
});

// ─── LOGGER ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`➡️ [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ Device tracking (soft — logs only, doesn't block)
//app.use(protect.length ? deviceTrack : deviceTrack);

// ─── ROUTES ───────────────────────────────────────────────────────────────
app.use("/api/v1/users",       userRoutes);
app.use("/api/v1/admin",       require("./routes/adminRoutes"));
app.use("/api/v1",             tournamentRoutes);

// ✅ Wallet: protect + rate limit + replay guard + fraud detection
app.use(
  "/api/v1/wallet",
  protect,
  walletLimiter,
  requestGuard,
  walletRoutes
);

// ✅ Join: rate limit + replay guard
app.use(
  "/api/v1/join",
  joinLimiter,
  requestGuard,
  tournamentRoutes   // or dedicated joinRoutes if separated
);

app.use("/api/v1/match",       matchRoutes);
app.use("/api/v1",             apiRoutes);
app.use("/api/v1/deposit",     depositRoutes);
app.use("/api/v1/withdraw",    withdrawRoutes);
app.use("/api/v1/admin/user",  adminAuthRoutes);
app.use("/api/v1/dashboard",   dashboardRoutes);
app.use("/api/v1/support",     supportRoute);
app.use("/api/v1/leaderboard", require("./routes/leaderboard_routes"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`⚠️ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

// ─── GLOBAL ERROR ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`❌ Uncaught error: ${err.stack}`);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// ─── START ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});