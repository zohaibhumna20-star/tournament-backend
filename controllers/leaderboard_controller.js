const Leaderboard = require("../models/leaderboard_model");
const sendResponse = require("../utils/response_handler");

// GET ALL — sorted by rank asc
const getLeaderboard = async (req, res) => {
  try {
    const data = await Leaderboard.find()
      .sort({ rank: 1 })
      .lean();
    return sendResponse(res, 200, true, "Leaderboard data", data);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// ADD ENTRY
const addEntry = async (req, res) => {
  try {
    const { username, wins, kills, rank } = req.body;
    if (!username) {
      return sendResponse(res, 400, false, "Username required");
    }
    const entry = await Leaderboard.create({
      username,
      wins:  wins  ?? 0,
      kills: kills ?? 0,
      rank:  rank  ?? 99,
    });
    return sendResponse(res, 201, true, "Entry added", entry);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// EDIT ENTRY
const editEntry = async (req, res) => {
  try {
    const { username, wins, kills, rank } = req.body;
    const entry = await Leaderboard.findByIdAndUpdate(
      req.params.id,
      { username, wins, kills, rank },
      { new: true }
    );
    if (!entry) return sendResponse(res, 404, false, "Entry not found");
    return sendResponse(res, 200, true, "Entry updated", entry);
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

// DELETE ENTRY
const deleteEntry = async (req, res) => {
  try {
    const entry = await Leaderboard.findByIdAndDelete(req.params.id);
    if (!entry) return sendResponse(res, 404, false, "Entry not found");
    return sendResponse(res, 200, true, "Entry deleted");
  } catch (error) {
    return sendResponse(res, 500, false, "Server Error");
  }
};

module.exports = { getLeaderboard, addEntry, editEntry, deleteEntry };