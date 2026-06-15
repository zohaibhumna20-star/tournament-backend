const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Match = require("../models/Match");


// ⭐ Star Rule
function shouldGiveStar(level, rank) {
  if (level >= 1 && level <= 3) return rank <= 12;
  if (level >= 4 && level <= 6) return rank <= 8;
  if (level >= 7 && level <= 8) return rank <= 5;
  if (level >= 9 && level <= 20) return rank <= 3;
  return false;
}

// 🏆 Category
function getCategory(level) {
  if (level == 1) return "Bronze";
  if (level >= 2 && level <= 4) return "Silver";
  if (level >= 5 && level <= 9) return "Gold";
  if (level >= 10 && level <= 15) return "Platinum";
  if (level >= 16 && level <= 20) return "Diamond";
  if (level >= 21 && level <= 22) return "Heroic";
  if (level >= 23 && level <= 24) return "Master";
  if (level >= 25 && level <= 30) return "Grand Master";
  return "Legend";
}


// 🔥 PROCESS MATCH API
router.post("/process-match", async (req, res) => {
  const { matchId, players } = req.body;

  let match = await Match.findOne({ matchId });

  // ❌ Duplicate Check
  if (match && match.processed) {
    return res.json({ message: "Already processed" });
  }

  match = new Match({ matchId, players });

  for (let player of players) {

    const user = await User.findById(player.userId);
    if (!user) continue;

    // ⭐ Star Logic
    if (shouldGiveStar(user.level, player.rank)) {
      user.stars += 1;
    }

    // 📊 Stats
    user.totalMatches += 1;

    if (player.rank === 1) {
      user.matchesWon += 1;
    }

    // 🔼 Level Up
    if (user.stars >= 3) {
      user.level += 1;
      user.stars = 0;
    }

    // 🏆 Category Update
    user.category = getCategory(user.level);

    await user.save();
  }

  match.processed = true;
  await match.save();

  res.json({ message: "Match Processed Successfully" });
});


// 👤 GET USER
router.get("/user/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

module.exports = router;