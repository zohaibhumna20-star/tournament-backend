const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Match   = require("../models/Match");

function shouldGiveStar(level, rank) {
  if (level >= 1 && level <= 3)  return rank <= 12;
  if (level >= 4 && level <= 6)  return rank <= 8;
  if (level >= 7 && level <= 8)  return rank <= 5;
  if (level >= 9 && level <= 20) return rank <= 3;
  return false;
}

function getCategory(level) {
  if (level === 1)                return "Bronze";
  if (level >= 2  && level <= 4)  return "Silver";
  if (level >= 5  && level <= 9)  return "Gold";
  if (level >= 10 && level <= 15) return "Platinum";
  if (level >= 16 && level <= 20) return "Diamond";
  if (level >= 21 && level <= 22) return "Heroic";
  if (level >= 23 && level <= 24) return "Master";
  if (level >= 25 && level <= 30) return "Grand Master";
  return "Legend";
}

// ✅ FIXED: try/catch + null checks + proper error responses
router.post("/process-match", async (req, res) => {
  try {
    const { matchId, players } = req.body;

    if (!matchId) {
      return res.status(400).json({ success: false, message: "matchId required" });
    }
    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ success: false, message: "players array required" });
    }

    const existing = await Match.findOne({ matchId });
    if (existing && existing.processed) {
      return res.json({ success: true, message: "Already processed" });
    }

    const match = existing || new Match({ matchId, players });

    for (const player of players) {
      try {
        if (!player.userId) continue;

        const user = await User.findById(player.userId);
        if (!user) continue;  // ✅ null check — crash nahi hoga

        if (shouldGiveStar(user.level, player.rank)) {
          user.stars += 1;
        }

        user.totalMatches += 1;

        if (player.rank === 1) {
          user.matchesWon += 1;
        }

        if (user.stars >= 3) {
          user.level += 1;
          user.stars  = 0;
        }

        user.category = getCategory(user.level);

        await user.save();
      } catch (playerErr) {
        // ✅ ek player fail ho to loop rukta nahi
        console.error("Player update error:", playerErr.message);
      }
    }

    match.processed = true;
    await match.save();

    return res.json({ success: true, message: "Match Processed Successfully" });

  } catch (error) {
    // ✅ koi bhi error ho — response zaroor jayega, hang nahi hoga
    console.error("process-match error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ FIXED: try/catch added
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;