import { Router } from "express";
import Submission from "../models/Submission.js";
import Tournament from "../models/Tournament.js"; // Import Tournament INSTEAD of Team
import Player from "../models/Player.js";
import { auth } from "../middleware/auth.js";
import { validatePlayingXI, validateSquad } from "../utils/validate.js";

const r = Router();

// A team submits their final squad
r.post("/submit", auth, async (req, res) => {
  if (req.user.role !== "team")
    return res.status(403).json({ error: "Forbidden" });
  const { teamId, tournamentId } = req.user;
  const { squadIds, playingXIIds, captainId, viceCaptainId } = req.body;
  try {
    const existing = await Submission.findOne({ team: teamId });
    if (existing?.locked)
      return res.status(400).json({ error: "Submission is locked." });
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    const team = tournament.teams.id(teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const squad = await Player.find({ _id: { $in: squadIds } });
    const xi = await Player.find({ _id: { $in: playingXIIds } });
    const squadErr = validateSquad(squad);
    if (squadErr) return res.status(400).json({ error: squadErr });
    const xiErr = validatePlayingXI(xi);
    if (xiErr) return res.status(400).json({ error: xiErr });

    const teamPlayerIds = new Set(team.players.map((id) => String(id)));
    for (const id of squadIds) {
      if (!teamPlayerIds.has(String(id))) {
        return res
          .status(400)
          .json({
            error: "Squad contains players not belonging to your team.",
          });
      }
    }

    const doc = await Submission.findOneAndUpdate(
      { team: teamId },
      {
        team: teamId,
        squad: squadIds,
        playingXI: playingXIIds,
        captain: captainId,
        viceCaptain: viceCaptainId,
      },
      { upsert: true, new: true }
    );
    res.json({ ok: true, submission: doc });
  } catch (e) {
    console.error("Error in /submit:", e);
    res.status(500).json({ error: "An unexpected server error occurred." });
  }
});

// Admin locks a submission
r.post("/lock", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { teamId, locked } = req.body;
  const sub = await Submission.findOneAndUpdate(
    { team: teamId },
    { locked },
    { new: true }
  );
  res.json({ ok: true, submission: sub });
});

// Admin grades a submission
r.post("/grade", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { teamId, grade } = req.body;
  const sub = await Submission.findOneAndUpdate(
    { team: teamId },
    { grade },
    { new: true }
  );
  res.json({ ok: true, submission: sub });
});

// Admin gets all submissions
r.get("/all", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  // This part is tricky with embedded docs. We'll populate what we can.
  // To get the team name, we need to fetch all tournaments.
  // This is a limitation of this data model that could be improved with more queries.
  const subs = await Submission.find().populate("squad").populate("playingXI");
  res.json(subs);
});

export default r;
