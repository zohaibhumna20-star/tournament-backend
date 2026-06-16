const cron           = require("node-cron");
const Tournament     = require("../models/Tournament");
const JoinTournament = require("../models/JoinTournament");
const notif          = require("../services/notificationService");

const convertTo24Hour = (timeStr) => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  if (!/AM|PM/i.test(trimmed)) return trimmed;

  const [timePart, modifier] = trimmed.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier.toUpperCase() === "AM") {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const buildTournamentDate = (dateStr, timeStr) => {
  try {
    const time24 = convertTo24Hour(timeStr);
    if (!time24) return null;
    const d = new Date(`${dateStr}T${time24}:00`);
    return isNaN(d.getTime()) ? null : d;
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

      // ✅ FIX: lean() use karo — DB load kam hoga
      const upcomingTournaments = await Tournament.find({ status: "upcoming" }).lean();
      console.log("Total Upcoming:", upcomingTournaments.length);

      const t15 = [];
      const t5  = [];

      for (const t of upcomingTournaments) {
        const tDate = buildTournamentDate(t.date, t.time);
        if (!tDate) continue;
        if (!t.notif15Min && tDate >= in14 && tDate <= in16) t15.push(t);
        if (!t.notif5Min  && tDate >= in4  && tDate <= in6)  t5.push(t);
      }

      // ── 15-min notifications ─────────────────────────────────────────
      for (const t of t15) {
        try {
          // ✅ FIX: notif15Min update pehle karo — double send rokne ke liye
          await Tournament.findByIdAndUpdate(t._id, { notif15Min: true });

          const joins   = await JoinTournament.find(
            { tournamentID: t._id.toString() }, { userID: 1 }
          ).lean();
          const userIds = joins.map(j => j.userID).filter(Boolean);

          console.log(`📢 15MIN → ${t.name} | Users: ${userIds.length}`);

          if (userIds.length > 0) {
            await notif.notify15Min(t, userIds);
            console.log(`✅ 15MIN SENT → ${t.name}`);
          }
        } catch (err) {
          // ✅ FIX: ek tournament fail ho to baaki rukein nahi
          console.error(`❌ 15MIN ERROR for ${t.name}:`, err.message);
        }
      }

      // ── 5-min notifications ──────────────────────────────────────────
      for (const t of t5) {
        try {
          // ✅ FIX: notif5Min update pehle karo
          await Tournament.findByIdAndUpdate(t._id, { notif5Min: true });

          const joins   = await JoinTournament.find(
            { tournamentID: t._id.toString() }, { userID: 1 }
          ).lean();
          const userIds = joins.map(j => j.userID).filter(Boolean);

          console.log(`📢 5MIN → ${t.name} | Users: ${userIds.length}`);

          if (userIds.length > 0) {
            await notif.notify5Min(t, userIds);
            console.log(`✅ 5MIN SENT → ${t.name}`);
          }
        } catch (err) {
          // ✅ FIX: ek tournament fail ho to baaki rukein nahi
          console.error(`❌ 5MIN ERROR for ${t.name}:`, err.message);
        }
      }

    } catch (err) {
      // ✅ FIX: cron crash hone par server crash nahi hoga
      console.error("❌ CRON TICK ERROR:", err.message);
    }
  });
};

module.exports = { startNotificationCron };