const User = require("../models/User");
const Deposit = require("../models/deposit_model");
const Withdraw = require("../models/withdraw_model");
const Tournament = require("../models/Tournament");
const JoinTournament = require("../models/JoinTournament");

// ─── Helper: Growth % calculate karo ─────────────────────────────────────────
function calcGrowth(current, previous) {
  if (!previous || previous === 0) return 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
}

// ─── Helper: Date ranges ──────────────────────────────────────────────────────
function getDateRanges() {
  const now = new Date();

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return { now, thisMonthStart, lastMonthStart, lastMonthEnd, sevenDaysAgo };
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const {
      now,
      thisMonthStart,
      lastMonthStart,
      lastMonthEnd,
      sevenDaysAgo,
    } = getDateRanges();

    // ══════════════════════════════════════════
    // 1. USERS
    // ══════════════════════════════════════════
    const [
      totalUsers,
      thisMonthUsers,
      lastMonthUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      User.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }),
    ]);

    const userGrowth = calcGrowth(thisMonthUsers, lastMonthUsers);

    // ══════════════════════════════════════════
    // 2. DEPOSITS (Revenue)
    // ══════════════════════════════════════════
    const [
      totalRevenueAgg,
      thisMonthRevenueAgg,
      lastMonthRevenueAgg,
    ] = await Promise.all([
      Deposit.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Deposit.aggregate([
        {
          $match: {
            status: "approved",
            createdAt: { $gte: thisMonthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Deposit.aggregate([
        {
          $match: {
            status: "approved",
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalRevenue      = totalRevenueAgg[0]?.total      || 0;
    const thisMonthRevenue  = thisMonthRevenueAgg[0]?.total  || 0;
    const lastMonthRevenue  = lastMonthRevenueAgg[0]?.total  || 0;
    const revenueGrowth     = calcGrowth(thisMonthRevenue, lastMonthRevenue);

    // ══════════════════════════════════════════
    // 3. WITHDRAWALS
    // ══════════════════════════════════════════
    const [
      totalWithdrawalsAgg,
      pendingWithdrawalsAgg,
      thisMonthWithdrawAgg,
      lastMonthWithdrawAgg,
    ] = await Promise.all([
      Withdraw.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Withdraw.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Withdraw.aggregate([
        {
          $match: {
            status: "approved",
            createdAt: { $gte: thisMonthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Withdraw.aggregate([
        {
          $match: {
            status: "approved",
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalWithdrawals      = totalWithdrawalsAgg[0]?.total      || 0;
    const pendingWithdrawals    = pendingWithdrawalsAgg[0]?.total    || 0;
    const thisMonthWithdraw     = thisMonthWithdrawAgg[0]?.total     || 0;
    const lastMonthWithdraw     = lastMonthWithdrawAgg[0]?.total     || 0;
    const withdrawalChange      = calcGrowth(thisMonthWithdraw, lastMonthWithdraw);

    // ══════════════════════════════════════════
    // 4. SYSTEM EARNINGS
    // ══════════════════════════════════════════
    const systemEarnings          = totalRevenue - totalWithdrawals;
    const thisMonthEarnings       = thisMonthRevenue - thisMonthWithdraw;
    const lastMonthEarnings       = lastMonthRevenue - lastMonthWithdraw;
    const earningsGrowth          = calcGrowth(thisMonthEarnings, lastMonthEarnings);

    // ══════════════════════════════════════════
    // 5. TOURNAMENTS
    // ══════════════════════════════════════════
    const [
      activeTournaments,
      completedMatches,
      thisMonthTournaments,
      lastMonthTournaments,
    ] = await Promise.all([
      Tournament.countDocuments({ status: "ongoing" }),
      Tournament.countDocuments({ status: "completed" }),
      Tournament.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      Tournament.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }),
    ]);

    const tournamentGrowth  = calcGrowth(thisMonthTournaments, lastMonthTournaments);
    const matchesGrowth     = calcGrowth(thisMonthTournaments, lastMonthTournaments);

    // ══════════════════════════════════════════
    // 6. REVENUE CHART — Last 7 days
    // ══════════════════════════════════════════
    const revenueByDay = await Deposit.aggregate([
      {
        $match: {
          status: "approved",
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueValues = [];
    const revenueLabels = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toISOString().substring(0, 10);
      const month = d.toLocaleString("default", { month: "short" });
      const label = `${month} ${d.getDate()}`;
      const found = revenueByDay.find((r) => r._id === key);
      revenueValues.push(found ? found.total : 0);
      revenueLabels.push(label);
    }

    // ══════════════════════════════════════════
    // 7. TOURNAMENT ACTIVITY — Last 10 weeks
    // ══════════════════════════════════════════
    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(tenWeeksAgo.getDate() - 70);

    const tournamentByWeek = await Tournament.aggregate([
      { $match: { createdAt: { $gte: tenWeeksAgo } } },
      {
        $group: {
          _id: { $week: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 10 weeks ka data — missing weeks = 0
    const weekLabels  = [];
    const weekValues  = [];

    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const weekNum = getWeekNumber(d);
      const month   = d.toLocaleString("default", { month: "short" });
      const label   = `${month} ${d.getDate()}`;
      const found   = tournamentByWeek.find((w) => w._id === weekNum);
      weekValues.push(found ? found.count : 0);
      weekLabels.push(label);
    }

    // ══════════════════════════════════════════
    // 8. USER DISTRIBUTION — platform field se
    //    Agar platform nahi hai → sab mobile
    // ══════════════════════════════════════════
    const platformAgg = await User.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$platform", "mobile"] },
          count: { $sum: 1 },
        },
      },
    ]);

    let mobileCount = 0;
    let pcCount     = 0;
    let tabletCount = 0;

    platformAgg.forEach((p) => {
      const platform = (p._id || "mobile").toLowerCase();
      if (platform === "pc" || platform === "desktop") {
        pcCount = p.count;
      } else if (platform === "tablet") {
        tabletCount = p.count;
      } else {
        mobileCount += p.count;
      }
    });

    const totalForDist  = mobileCount + pcCount + tabletCount || 1;
    const mobilePct     = parseFloat(((mobileCount / totalForDist) * 100).toFixed(1));
    const pcPct         = parseFloat(((pcCount     / totalForDist) * 100).toFixed(1));
    const tabletPct     = parseFloat(((tabletCount / totalForDist) * 100).toFixed(1));

    // ══════════════════════════════════════════
    // 9. RECENT USERS
    // ══════════════════════════════════════════
    const recentUsersRaw = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("username email coins deposit winning bonus createdAt");

    const recentUsers = recentUsersRaw.map((u) => ({
      id:     u._id,
      name:   u.username,
      email:  u.email,
      coins:  u.coins  || 0,
      status: "Active",
    }));

    // ══════════════════════════════════════════
    // 10. RECENT TRANSACTIONS
    // ══════════════════════════════════════════
    const [recentDeposits, recentWithdraws] = await Promise.all([
      Deposit.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "username email"),
      Withdraw.find()
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const depositTx = recentDeposits.map((d) => ({
      id:        "#D" + d._id.toString().slice(-5).toUpperCase(),
      userName:  d.user?.username || "Unknown",
      amount:    d.amount,
      type:      "Deposit",
      status:
        d.status === "approved"
          ? "Success"
          : d.status === "rejected"
          ? "Failed"
          : "Pending",
      createdAt: d.createdAt,
    }));

    const withdrawTx = recentWithdraws.map((w) => ({
      id:        "#W" + w._id.toString().slice(-5).toUpperCase(),
      userName:  w.userName || "Unknown",
      amount:    w.amount,
      type:      "Withdrawal",
      status:
        w.status === "approved"
          ? "Success"
          : w.status === "rejected"
          ? "Failed"
          : "Pending",
      createdAt: w.createdAt,
    }));

    const recentTransactions = [...depositTx, ...withdrawTx]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // ══════════════════════════════════════════
    // FINAL RESPONSE
    // ══════════════════════════════════════════
    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalRevenue,
          activeTournaments,
          completedMatches,
          pendingWithdrawals,
          systemEarnings,
          userGrowth,
          revenueGrowth,
          tournamentGrowth,
          matchesGrowth,
          withdrawalChange,
          earningsGrowth,
        },
        revenueChart: {
          values: revenueValues,
          labels: revenueLabels,
        },
        tournamentChart: {
          values: weekValues,
          labels: weekLabels,
        },
        userDistribution: {
          mobile:     mobilePct,
          pc:         pcPct,
          tablet:     tabletPct,
          totalUsers,
        },
        recentTransactions,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/dashboard/activity ─────────────────────────────────────────────
exports.getLiveActivity = async (req, res) => {
  try {
    const [recentDeposits, recentWithdraws, recentJoins, recentUsers] =
      await Promise.all([
        Deposit.find({ status: "pending" })
          .sort({ createdAt: -1 })
          .limit(4)
          .populate("user", "username"),
        Withdraw.find({ status: "pending" })
          .sort({ createdAt: -1 })
          .limit(3),
        JoinTournament.find()
          .sort({ joinedAt: -1 })
          .limit(4),
        User.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .select("username createdAt"),
      ]);

    const activities = [];

    recentDeposits.forEach((d) => {
      activities.push({
        type:        "payment",
        title:       "Deposit Request",
        description: `${d.user?.username || "User"} • Rs ${d.amount}`,
        timeAgo:     timeAgo(d.createdAt),
        colorHex:    0xFF00BCD4,
        createdAt:   d.createdAt,
      });
    });

    recentWithdraws.forEach((w) => {
      activities.push({
        type:        "withdrawal",
        title:       "Withdraw Request",
        description: `${w.userName || "User"} • Rs ${w.amount}`,
        timeAgo:     timeAgo(w.createdAt),
        colorHex:    0xFFFF9100,
        createdAt:   w.createdAt,
      });
    });

    recentJoins.forEach((j) => {
      activities.push({
        type:        "tournament",
        title:       "Tournament Joined",
        description: `${j.freeFireUsername || j.userName || "Player"} joined`,
        timeAgo:     timeAgo(j.joinedAt),
        colorHex:    0xFF7B1FA2,
        createdAt:   j.joinedAt,
      });
    });

    recentUsers.forEach((u) => {
      activities.push({
        type:        "user_reg",
        title:       "New Registration",
        description: `${u.username} registered`,
        timeAgo:     timeAgo(u.createdAt),
        colorHex:    0xFF00E676,
        createdAt:   u.createdAt,
      });
    });

    activities.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      data:    activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "just now";
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getWeekNumber(d) {
  const date  = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}