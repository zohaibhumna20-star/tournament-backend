const cron           = require("node-cron");
const Tournament     = require("../models/Tournament");
const JoinTournament = require("../models/JoinTournament");
const notif          = require("../services/notificationService");

const convertTo24Hour = (timeStr) => {
  if (!timeStr) return null;

  const trimmed = timeStr.trim();

  if (!/AM|PM/i.test(trimmed)) {
    return trimmed;
  }

  const [timePart, modifier] = trimmed.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier.toUpperCase() === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
};

const buildTournamentDate = (dateStr, timeStr) => {
  try {
    const time24 = convertTo24Hour(timeStr);
    if (!time24) return null;

    const isoString = `${dateStr}T${time24}:00`;
    const d = new Date(isoString);

    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const startNotificationCron = () => {
  console.log("🚀 CRON STARTED");

  cron.schedule("* * * * *", async () => {
    console.log("⏰ CRON TICK:", new Date().toISOString());

    try {
      const now  = new Date();
      const in16 = new Date(now.getTime() + 16 * 60 * 1000);
      const in14 = new Date(now.getTime() + 14 * 60 * 1000);
      const in6  = new Date(now.getTime() +  6 * 60 * 1000);
      const in4  = new Date(now.getTime() +  4 * 60 * 1000);

      const upcomingTournaments = await Tournament.find({ status: "upcoming" });
      console.log("🎯 FETCHING TOKENS...");
      console.log("Total Upcoming Tournaments Found:", upcomingTournaments.length);

      const t15 = [];
      const t5  = [];

      for (const t of upcomingTournaments) {
        const tournamentDate = buildTournamentDate(t.date, t.time);
        if (!tournamentDate) continue;

        if (!t.notif15Min && tournamentDate >= in14 && tournamentDate <= in16) {
          t15.push(t);
        }

        if (!t.notif5Min && tournamentDate >= in4 && tournamentDate <= in6) {
          t5.push(t);
        }
      }

      // ── 15-min notifications ─────────────────────────────────────────────
      for (const t of t15) {
        const joins   = await JoinTournament.find(
          { tournamentID: t._id.toString() },
          { userID: 1 }
        );
        const userIds = joins.map(j => j.userID).filter(Boolean);

        console.log("Total Users Found:", joins.length);
        console.log("User IDs:", userIds);
        console.log("📢 SENDING NOTIFICATION...");
        console.log("Tournament:", t.name);
        console.log("Users Count:", userIds.length);

        t.notif15Min = true;
        await t.save();

        if (userIds.length > 0) {
          await notif.notify15Min(t, userIds);
          console.log("✅ NOTIFICATION SENT SUCCESSFULLY — 15 MIN →", t.name);
        }
      }

      // ── 5-min notifications ──────────────────────────────────────────────
      for (const t of t5) {
        const joins   = await JoinTournament.find(
          { tournamentID: t._id.toString() },
          { userID: 1 }
        );
        const userIds = joins.map(j => j.userID).filter(Boolean);

        console.log("Total Users Found:", joins.length);
        console.log("User IDs:", userIds);
        console.log("📢 SENDING NOTIFICATION...");
        console.log("Tournament:", t.name);
        console.log("Users Count:", userIds.length);

        t.notif5Min = true;
        await t.save();

        if (userIds.length > 0) {
          await notif.notify5Min(t, userIds);
          console.log("✅ NOTIFICATION SENT SUCCESSFULLY — 5 MIN →", t.name);
        }
      }

    } catch (err) {
      console.error("❌ CRON ERROR:", err);
      console.error("Stack:", err.stack);
    }
  });
};

module.exports = { startNotificationCron };