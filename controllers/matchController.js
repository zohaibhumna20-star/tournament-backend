const Match = require("../models/Match");


// Create Match Room
exports.createMatch = async (req, res) => {
  try {

    const { tournamentID, roomID, roomPassword } = req.body;

    const newMatch = new Match({
      tournamentID,
      roomID,
      roomPassword
    });

    await newMatch.save();

    res.status(201).json({
      message: "Match room created successfully",
      match: newMatch
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};



// Get Match by Tournament
exports.getMatchByTournament = async (req, res) => {
  try {

    const { tournamentID } = req.params;

    const match = await Match.findOne({ tournamentID });

    if (!match) {
      return res.status(404).json({
        message: "Match not found"
      });
    }

    res.json({
      match
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};