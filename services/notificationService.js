const admin = require("../config/firebase");
const User  = require("../models/User");

// ── Core sender ──────────────────────────────────────────────────────────────
const sendNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return;
    const valid = [...new Set(tokens.filter(t => t && t.trim() !== ""))];
    if (valid.length === 0) return;

    const stringData = {};
    Object.keys(data).forEach(k => { stringData[k] = String(data[k]); });

    const CHUNK = 500;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const msg = {
        tokens: chunk,
        notification: { title, body },
        data: stringData,
        android: {
          priority: "high",
          notification: { sound: "default", clickAction: "FLUTTER_NOTIFICATION_CLICK" },
        },
        apns: { payload: { aps: { sound: "default", badge: 1 } } },
      };
      const resp = await admin.messaging().sendEachForMulticast(msg);

      // Remove bad tokens
      resp.responses.forEach(async (r, idx) => {
        if (!r.success &&
          (r.error?.code === "messaging/invalid-registration-token" ||
           r.error?.code === "messaging/registration-token-not-registered")) {
          const bad = chunk[idx];
          await User.updateMany(
            { fcmTokens: bad },
            { $pull: { fcmTokens: bad }, $set: { fcmToken: "" } }
          ).catch(() => {});
        }
      });

      console.log(`[FCM] ✅ Sent ${resp.successCount}/${chunk.length}`);
    }
  } catch (err) {
    console.error("[FCM] sendNotification error:", err.message);
  }
};

// ── Get ALL user tokens ───────────────────────────────────────────────────────
const getAllTokens = async () => {
  const users = await User.find(
    { fcmTokens: { $exists: true, $not: { $size: 0 } } },
    { fcmTokens: 1 }
  );
  return users.flatMap(u => u.fcmTokens || []).filter(Boolean);
};

// ── Get tokens for specific userIDs ──────────────────────────────────────────
const getTokensForUsers = async (userIds) => {
  const ids   = userIds.map(id => id.toString());
  const users = await User.find(
    { _id: { $in: ids } },
    { fcmTokens: 1 }
  );
  return users.flatMap(u => u.fcmTokens || []).filter(Boolean);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣  New Tournament Created → All users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notifyNewTournament = async (tournament) => {
  const tokens = await getAllTokens();
  let body = `${tournament.name} tournament is live. Join now!`;
  if (tournament.category) body += ` | Category: ${tournament.category}`;
  if (tournament.subType && tournament.subType !== "NONE")
    body += ` | Mode: ${tournament.subType}`;
  await sendNotification({
    tokens,
    title: "New Tournament Created 🎮",
    body,
    data: { tournamentId: String(tournament._id), type: "new_tournament" },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣  50% Slots Filled → All users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notifyHalfSlots = async (tournament) => {
  const tokens = await getAllTokens();
  await sendNotification({
    tokens,
    title: "Slots Filling Fast! ⚡",
    body:  `${tournament.name}: Limited slots available. Join now!`,
    data:  { tournamentId: String(tournament._id), type: "half_slots" },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣  Last Few Slots → All users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notifyLastSlots = async (tournament) => {
  const tokens    = await getAllTokens();
  const remaining = tournament.maxPlayers - tournament.joinedPlayers;
  await sendNotification({
    tokens,
    title: "Almost Full! 🔥",
    body:  `${tournament.name}: Only ${remaining} slot(s) left! Hurry up!`,
    data:  { tournamentId: String(tournament._id), type: "last_slots" },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4️⃣  Room ID & Password Added → Joined users only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notifyRoomDetails = async (tournament, joinedUserIds) => {
  const tokens = await getTokensForUsers(joinedUserIds);
  await sendNotification({
    tokens,
    title: "Room Details Added 🏠",
    body:  `${tournament.name}: Room ID & Password added. Copy now and join the match!`,
    data: {
      tournamentId: String(tournament._id),
      type:         "room_details",
      roomId:       tournament.roomId       || "",
      roomPassword: tournament.roomPassword || "",
    },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5️⃣  15 Min Before → Joined users only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notify15Min = async (tournament, joinedUserIds) => {
  const tokens = await getTokensForUsers(joinedUserIds);
  await sendNotification({
    tokens,
    title: "Match Starting Soon ⏰",
    body:  `${tournament.name}: Match starts in 15 minutes. Get ready!`,
    data:  { tournamentId: String(tournament._id), type: "remind_15" },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6️⃣  5 Min Before → Joined users only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notify5Min = async (tournament, joinedUserIds) => {
  const tokens = await getTokensForUsers(joinedUserIds);
  await sendNotification({
    tokens,
    title: "Last Call! 🚨",
    body:  `${tournament.name}: Only 5 minutes left! Join your room now!`,
    data:  { tournamentId: String(tournament._id), type: "remind_5" },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7️⃣  Result Declared → Joined users only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const notifyResult = async (tournament, joinedUserIds) => {
  const tokens = await getTokensForUsers(joinedUserIds);
  await sendNotification({
    tokens,
    title: "Result Declared 🏆",
    body:  `${tournament.name}: Match result is live. Check now!`,
    data:  { tournamentId: String(tournament._id), type: "result" },
  });
};

module.exports = {
  sendNotification,
  getAllTokens,
  getTokensForUsers,
  notifyNewTournament,
  notifyHalfSlots,
  notifyLastSlots,
  notifyRoomDetails,
  notify15Min,
  notify5Min,
  notifyResult,
};