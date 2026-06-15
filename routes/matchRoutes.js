const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const User = require("../models/User");

// Routes already existing
const {
  createMatch,
  getMatchByTournament
} = require("../controllers/matchController");

// Create Match
router.post("/create", createMatch);

// Get Match Details
router.get("/:tournamentID", getMatchByTournament);

// ⭐ Star Rule
function shouldGiveStar(level, rank) {
  if (level >= 1 && level <= 3) return rank <= 12;
  if (level >= 4 && level <= 6) return rank <= 8;
  if (level >= 7 && level <= 8) return rank <= 5;
  if (level >= 9 && level <= 20) return rank <= 3;
  return false;
}

// 🏆 Category (Detailed Levels)
function getCategory(level) {
  const categories = [
    "Bronze",              //1
    "Silver I",            //2
    "Silver II",           //3
    "Silver III",          //4
    "Gold I",              //5
    "Gold II",             //6
    "Gold III",            //7
    "Gold IV",             //8
    "Gold V",              //9
    "Platinum I",          //10
    "Platinum II",         //11
    "Platinum III",        //12
    "Platinum IV",         //13
    "Platinum V",          //14
    "Platinum VI",         //15
    "Diamond I",           //16
    "Diamond II",          //17
    "Diamond III",         //18
    "Diamond IV",          //19
    "Diamond V",           //20
    "Heroic",              //21
    "Elite Heroic",        //22
    "Master",              //23
    "Elite Master",        //24
    "Grand Master I",      //25
    "Grand Master II",     //26
    "Grand Master III",    //27
    "Grand Master IV",     //28
    "Grand Master V",      //29
    "Biggest Grand Master" //30
  ];

  if (level < 1) return "Bronze";
  if (level > categories.length) return "Legend";

  return categories[level - 1];
}

// 🔥 Process Match API
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

    // 📊 Stats Update
    user.totalMatches += 1;
    if (player.rank === 1) user.matchesWon += 1;
    user.totalKills += player.kills || 0;
    user.coinWin += player.coins || 0;

    // 🔼 Level Up
    if (user.stars >= 3) {
      user.level += 1;
      user.stars = 0;
    }

    // 🏆 Update Category (Detailed)
    user.category = getCategory(user.level);

    await user.save();
  }

  match.processed = true;
  await match.save();

  res.json({ message: "Match Processed Successfully" });
});

module.exports = router;