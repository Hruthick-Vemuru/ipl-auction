import { Router } from "express";
import Submission from "../models/Submission.js";
import Tournament from "../models/Tournament.js";
import Player from "../models/Player.js";
import { auth } from "../middleware/auth.js";
import { validatePlayingXI, validateSquad } from "../utils/validate.js";

const r = Router();

// A team sends their squad data here
r.post("/submit", auth, async (req, res) => {
  if (req.user.role !== "team")
    return res.status(403).json({ error: "Forbidden" });
  const { teamId } = req.user;
  const { squadIds, playingXIIds, captainId, viceCaptainId } = req.body;
  try {
    const existing = await Submission.findOne({ team: teamId });
    if (existing?.locked)
      return res
        .status(400)
        .json({ error: "Your submission has been locked by the admin." });
    // ... (validation logic remains the same)
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

// The admin sends a request here to lock or unlock a submission
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

// The admin sends a request here to save a grade
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

// The admin requests all submissions for a tournament here
r.get("/tournament/:tournamentId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });

    const teamIds = tournament.teams.map((t) => t._id);
    const subs = await Submission.find({ team: { $in: teamIds } })
      .populate("squad")
      .populate("playingXI")
      .populate("captain")
      .populate("viceCaptain");
    res.json(subs);
  } catch (e) {
    console.error("Error fetching submissions:", e);
    res.status(500).json({ error: "An unexpected server error occurred." });
  }
});

export default r;
