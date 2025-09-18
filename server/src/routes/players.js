import { Router } from "express";
import { auth } from "../middleware/auth.js";
import Player from "../models/Player.js";
import Tournament from "../models/Tournament.js";

const r = Router();

// GET /api/players - List players OWNED BY THE LOGGED-IN ADMIN
r.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const players = await Player.find({ admin: req.user.id });
    res.json(players);
  } catch (e) {
    res.status(500).json({ error: "Server error while fetching players." });
  }
});

// GET /api/players/unassigned/:tournamentId
r.get("/unassigned/:tournamentId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const assignedPlayerIds = tournament.pools.flatMap((p) => p.players);
    const players = await Player.find({
      admin: req.user.id,
      status: "Available",
      _id: { $nin: assignedPlayerIds },
    });
    res.json(players);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Server error while fetching unassigned players." });
  }
});

// POST /api/players - Create a player
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    // This will now receive the clean `stats` object from the frontend
    const playerData = req.body;

    const existingPlayer = await Player.findOne({
      name: playerData.name.trim(),
      admin: req.user.id,
    });
    if (existingPlayer) {
      return res
        .status(409)
        .json({
          error: `You have already created a player named "${playerData.name}".`,
        });
    }

    const player = await Player.create({
      ...playerData,
      name: playerData.name.trim(),
      admin: req.user.id,
    });
    res.status(201).json(player);
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// DELETE /api/players/:playerId
r.delete("/:playerId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ _id: playerId, admin: req.user.id });
    if (!player) {
      return res.status(404).json({
        error: "Player not found or you do not have permission to delete it.",
      });
    }

    await Tournament.updateMany(
      { "pools.players": playerId },
      { $pull: { "pools.$.players": playerId } }
    );

    await Player.findByIdAndDelete(playerId);
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting player:", e);
    res.status(500).json({ error: "Server error while deleting player." });
  }
});

export default r;
