const express  = require("express");
const router   = express.Router();
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");

const tournamentController = require("../controllers/tournamentController");
const Tournament       = require("../models/Tournament");
const JoinTournament   = require("../models/JoinTournament");
const TournamentResult = require("../models/tournamentResult");
const User             = require("../models/User");
const Transaction      = require("../models/Transaction");

const notif = require("../services/notificationService");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Multer image upload setup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const filename = `tournament_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP images are allowed"), false);
    }
  },
});

router.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const protocol = req.protocol;
    const host     = req.get("host");
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, imageUrl, message: "Image uploaded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Basic CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/tournaments",        tournamentController.getAllTournaments);
router.post("/tournaments",       tournamentController.createTournament);
router.delete("/tournaments/:id", tournamentController.deleteTournament);
router.put("/tournaments/:id",    tournamentController.updateTournament);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Join Tournament
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { protect } = require("../middleware/authMiddleware");

router.post("/join-tournament", protect, tournamentController.joinTournament);

router.post("/tournaments/:id/verify-password", tournamentController.verifyJoinPassword);
router.post("/tournaments/:id/verify-code",     tournamentController.verifyJoinPassword);

router.get("/join-tournament/check", async (req, res) => {
  try {
    const { userId, tournamentId } = req.query;
    const joined = await JoinTournament.findOne({ userID: userId, tournamentID: tournamentId });
    res.json({ success: true, joined: !!joined });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tournaments/:id/seats", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }
    const seats = tournament.joinedUsers.map(u => u.seatNumber);
    res.json({ success: true, seats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tournaments/:id/room", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({
      success:      true,
      roomId:       tournament.roomId       ?? "Not set yet",
      roomPassword: tournament.roomPassword ?? "Not set yet",
      roomStatus:   tournament.roomStatus   ?? "not_assigned"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/tournaments/:id/room", async (req, res) => {
  try {
    const { roomId, roomPassword } = req.body;

    if (!roomId || roomId.trim() === "") {
      return res.status(400).json({ success: false, message: "Room ID cannot be empty" });
    }
    if (!roomPassword || roomPassword.trim() === "") {
      return res.status(400).json({ success: false, message: "Room Password cannot be empty" });
    }

    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      {
        roomId:         roomId.trim(),
        roomPassword:   roomPassword.trim(),
        roomAssignedAt: new Date(),
        roomStatus:     "assigned"
      },
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    const joins     = await JoinTournament.find({ tournamentID: req.params.id }, { userID: 1 });
    const joinedIds = joins.map(j => j.userID).filter(Boolean);
    if (joinedIds.length > 0) {
      notif.notifyRoomDetails(tournament, joinedIds).catch(err =>
        console.error("[NOTIF] roomDetails:", err.message)
      );
    }

    res.json({
      success:      true,
      message:      "Room assigned successfully",
      roomId:       tournament.roomId,
      roomPassword: tournament.roomPassword
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tournaments/:id/participants", async (req, res) => {
  try {
    const participants = await JoinTournament.find({ tournamentID: req.params.id });
    res.json({ success: true, count: participants.length, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/tournaments/:id/start", async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id, { status: "ongoing" }, { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: "Tournament not found" });
    res.json({ success: true, message: "Match started", status: tournament.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/tournaments/:id/end", async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id, { status: "completed" }, { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: "Tournament not found" });
    res.json({ success: true, message: "Match ended", status: tournament.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/tournaments/:id/cancel", async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id, { status: "cancelled" }, { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: "Tournament not found" });
    res.json({ success: true, message: "Match cancelled", status: tournament.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Stars + Level helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function shouldGiveStar(level, rank) {
  if (level >= 1 && level <= 3) return rank <= 12;
  if (level >= 4 && level <= 6) return rank <= 8;
  if (level >= 7 && level <= 8) return rank <= 5;
  if (level >= 9 && level <= 20) return rank <= 3;
  return false;
}

function getCategory(level) {
  const categories = [
    "Bronze", "Silver I", "Silver II", "Silver III",
    "Gold I", "Gold II", "Gold III", "Gold IV", "Gold V",
    "Platinum I", "Platinum II", "Platinum III", "Platinum IV", "Platinum V", "Platinum VI",
    "Diamond I", "Diamond II", "Diamond III", "Diamond IV", "Diamond V",
    "Heroic", "Elite Heroic", "Master", "Elite Master",
    "Grand Master I", "Grand Master II", "Grand Master III", "Grand Master IV", "Grand Master V",
    "Biggest Grand Master"
  ];
  if (level < 1) return "Bronze";
  if (level > categories.length) return "Legend";
  return categories[level - 1];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Submit Result
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/tournaments/:id/result", async (req, res) => {
  try {
    const { winners, resultImage } = req.body;
    const tournamentId = req.params.id;

    if (!winners || winners.length === 0) {
      return res.status(400).json({ success: false, message: "Winners required" });
    }

    const existing = await TournamentResult.findOne({ tournamentId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Result already submitted" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    const allParticipants = await JoinTournament.find({ tournamentID: tournamentId });

    // Update totalMatches for all participants
    for (const p of allParticipants) {
      const uid = p.userID?.toString();
      if (!uid) continue;
      await User.findByIdAndUpdate(uid, { $inc: { totalMatches: 1 } }).catch(() => {});
    }

    // Update winners wallet + stars/level + transaction
    for (const winner of winners) {
      if (!winner.userId) continue;
      const uid   = winner.userId.toString().trim();
      const prize = Number(winner.prize) || 0;
      const pos   = Number(winner.position) || 99;

      try {
        const winnerUser = await User.findById(uid);
        if (!winnerUser) continue;

        if (prize > 0) {
          winnerUser.winning    = (winnerUser.winning    || 0) + prize;
          winnerUser.coins      = (winnerUser.coins      || 0) + prize;
          winnerUser.coinWin    = (winnerUser.coinWin    || 0) + prize;
          winnerUser.matchesWon = (winnerUser.matchesWon || 0) + 1;
          winnerUser.totalWins  = (winnerUser.totalWins  || 0) + 1;
        }

        if (shouldGiveStar(winnerUser.level || 1, pos)) {
          winnerUser.stars = (winnerUser.stars || 0) + 1;
        }
        if ((winnerUser.stars || 0) >= 3) {
          winnerUser.level = (winnerUser.level || 1) + 1;
          winnerUser.stars = 0;
        }
        winnerUser.category = getCategory(winnerUser.level || 1);

        await winnerUser.save();

        if (prize > 0) {
          await new Transaction({
            userId:       uid,
            amount:       prize,
            type:         "credit",
            source:       "tournament_win",
            tournamentId: tournamentId,
          }).save().catch(() => {});
        }
      } catch (e) {
        console.error("Winner update error:", e.message);
      }
    }

    const result = new TournamentResult({
      tournamentId,
      winners: winners.map(w => ({
        position: Number(w.position),
        userId:   w.userId.toString().trim(),
        username: (w.username || "").toString().trim(),
        prize:    Number(w.prize) || 0,
        kills:    Number(w.kills) || 0,
      })),
      resultImage: resultImage || null,
      verified:    true
    });
    await result.save();

    tournament.status = "completed";
    await tournament.save();

    const joinedIds = allParticipants.map(p => p.userID).filter(Boolean);
    if (joinedIds.length > 0) {
      notif.notifyResult(tournament, joinedIds).catch(err =>
        console.error("[NOTIF] result:", err.message)
      );
    }

    res.status(201).json({
      success: true,
      message: "Result submitted and prizes distributed",
      data:    result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ FIXED: GET Result — returns Result Entry + Per Kill combined
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/tournaments/:id/result", async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // ✅ FIX 1: Find result by string tournamentId (handles both ObjectId and string)
    const result = await TournamentResult.findOne({ tournamentId: tournamentId.toString() });

    // ✅ FIX 2: Get per-kill transaction data for this tournament
    const perKillTransactions = await Transaction.find({
      tournamentId: tournamentId.toString(),
      source:       "per_kill",
    }).lean();

    // ✅ FIX 3: Get all participants to map userID → freeFireUsername/playerName
    const participants = await JoinTournament.find({ tournamentID: tournamentId }).lean();

    // Build participant map: userID → participant info
    const participantMap = {};
    for (const p of participants) {
      const uid = (p.userID || "").toString().trim();
      if (uid) {
        participantMap[uid] = {
          username:         p.freeFireUsername || p.playerName || p.userName || "Unknown",
          freeFireUsername: p.freeFireUsername || "",
          playerName:       p.playerName       || "",
          participantId:    p.participantId    || "",
        };
      }
    }

    // ✅ FIX 4: Build per-kill breakdown — group by userId
    const perKillMap = {};
    for (const tx of perKillTransactions) {
      const uid = (tx.userId || "").toString().trim();
      if (!uid) continue;
      if (!perKillMap[uid]) {
        perKillMap[uid] = {
          userId:   uid,
          username: participantMap[uid]?.username || "Unknown",
          kills:    0,
          earnings: 0,
        };
      }
      perKillMap[uid].earnings += (tx.amount || 0);
    }

    // ✅ FIX 5: Try to get kills from tournament perKillRate + earnings math
    // If kills were stored in Transaction meta, use those; otherwise calculate
    const perKillRate = (await Tournament.findById(tournamentId).lean())?.perKillRate || 0;
    for (const uid of Object.keys(perKillMap)) {
      if (perKillRate > 0) {
        perKillMap[uid].kills = Math.round(perKillMap[uid].earnings / perKillRate);
      }
    }

    const perKillBreakdown = Object.values(perKillMap);

    // ✅ FIX 6: If TournamentResult exists, return it with per-kill data merged
    if (result) {
      // Enrich winners with kills from per-kill data if not already present
      const enrichedWinners = result.winners.map(w => {
        const uid      = (w.userId || "").toString().trim();
        const pkData   = perKillMap[uid];
        const kills    = (w.kills > 0) ? w.kills : (pkData?.kills || 0);
        const earnings = pkData?.earnings || 0;
        return {
          position:         w.position,
          userId:           uid,
          username:         w.username || participantMap[uid]?.username || "Unknown",
          prize:            w.prize    || 0,
          kills:            kills,
          perKillEarnings:  earnings,
          totalEarnings:    (w.prize || 0) + earnings,
        };
      });

      return res.json({
        success: true,
        data: {
          _id:              result._id,
          tournamentId:     result.tournamentId,
          verified:         result.verified,
          resultImage:      result.resultImage || null,
          createdAt:        result.createdAt,
          // ✅ Enriched winners with kills + perKillEarnings
          winners:          enrichedWinners,
          // ✅ Full per-kill breakdown for ALL participants (not just winners)
          perKillBreakdown: perKillBreakdown,
          hasPerKill:       perKillBreakdown.length > 0,
          hasResult:        true,
        }
      });
    }

    // ✅ FIX 7: No TournamentResult yet — but per-kill data exists → return per-kill only
    if (perKillBreakdown.length > 0) {
      return res.json({
        success: true,
        data: {
          tournamentId:     tournamentId,
          verified:         false,
          resultImage:      null,
          winners:          [],
          perKillBreakdown: perKillBreakdown,
          hasPerKill:       true,
          hasResult:        false,
        }
      });
    }

    // ✅ FIX 8: Nothing found
    return res.status(404).json({
      success: false,
      message: "Result not found"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Per Kill Entry — wallet update
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Per Kill Entry — wallet update
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post("/tournaments/:id/perkill", async (req, res) => {
  try {
    const { perKillRate, players } = req.body;
    const tournamentId = req.params.id;

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: "Tournament ID required" });
    }
    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ success: false, message: "Players list required" });
    }

    const rate = Number(perKillRate) || 0;
    if (rate <= 0) {
      return res.status(400).json({ success: false, message: "Per kill rate must be greater than 0" });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    // ✅ FIX ISSUE 3: Duplicate per kill submission prevention
    // Check if per-kill was already submitted for this tournament
    const existingPerKill = await Transaction.findOne({
      tournamentId: tournamentId.toString(),
      source: "per_kill",
    });

    if (existingPerKill) {
      return res.status(400).json({
        success: false,
        message: "Per kill already submitted for this tournament",
        isAlreadySubmitted: true,
      });
    }

    const results = [];

    for (const player of players) {
      const uid   = (player.userId || "").toString().trim();
      const kills = Number(player.kills) || 0;
      if (!uid || kills < 0) continue;

      const earning = kills * rate;

      try {
        const updatedUser = await User.findById(uid);
        if (!updatedUser) {
          results.push({ userId: uid, username: player.username, kills, earning, success: false, error: "User not found" });
          continue;
        }

        if (kills > 0) {
          updatedUser.totalKills = (updatedUser.totalKills || 0) + kills;
        }
        if (earning > 0) {
          updatedUser.winning = (updatedUser.winning || 0) + earning;
          updatedUser.coins   = (updatedUser.coins   || 0) + earning;
          updatedUser.coinWin = (updatedUser.coinWin || 0) + earning;
        }

        await updatedUser.save();

        if (earning > 0) {
          await new Transaction({
            userId:       uid,
            amount:       earning,
            type:         "credit",
            source:       "per_kill",
            tournamentId: tournamentId,
          }).save().catch(() => {});
        }

        results.push({
          userId:   uid,
          username: player.username,
          kills,
          earning,
          success:  true
        });
      } catch (err) {
        results.push({
          userId:   uid,
          username: player.username,
          kills,
          earning,
          success:  false,
          error:    err.message
        });
      }
    }

    await Tournament.findByIdAndUpdate(tournamentId, {
      $set: { perKillRate: rate }
    }).catch(() => {});

    return res.status(200).json({
      success:      true,
      message:      "Kills submitted and earnings distributed",
      perKillRate:  rate,
      totalPlayers: results.length,
      data:         results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;