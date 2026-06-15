const express    = require("express");
const router     = express.Router();
const {
  getLeaderboard,
  addEntry,
  editEntry,
  deleteEntry,
} = require("../controllers/leaderboard_controller");

router.get("/",        getLeaderboard);
router.post("/",       addEntry);
router.put("/:id",     editEntry);
router.delete("/:id",  deleteEntry);

module.exports = router;