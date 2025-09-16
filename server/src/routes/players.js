// ===== FIXED players.js =====

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
    console.error("Error fetching players:", e);
    res.status(500).json({ error: "Server error while fetching players." });
  }
});

// GET /api/players/unassigned/:tournamentId - Get TRULY unassigned players for the LOGGED-IN ADMIN
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
    console.error("Error fetching unassigned players:", e);
    res
      .status(500)
      .json({ error: "Server error while fetching unassigned players." });
  }
});

// POST /api/players - Create a player OWNED BY THE LOGGED-IN ADMIN
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { name, role, nationality, basePrice } = req.body;

    if (!name || !role || !nationality || basePrice === undefined) {
      return res
        .status(400)
        .json({
          error: "Name, role, nationality, and base price are required.",
        });
    }
    if (isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      return res
        .status(400)
        .json({ error: "Base price must be a valid, non-negative number." });
    }

    // --- THIS IS THE FIX for the duplicate name constraint ---
    const existingPlayer = await Player.findOne({
      name: name.trim(),
      admin: req.user.id,
    });
    if (existingPlayer) {
      return res
        .status(409)
        .json({ error: `You have already created a player named "${name}".` });
    }

    const player = await Player.create({
      name: name.trim(),
      role,
      nationality,
      basePrice,
      admin: req.user.id,
    });
    res.status(201).json(player);
  } catch (error) {
    console.error("Error creating player:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((val) => val.message)
        .join(", ");
      return res.status(400).json({ error: messages });
    }
    res
      .status(500)
      .json({
        error: "An unexpected error occurred while creating the player.",
      });
  }
});

// --- NEW ROUTE TO HANDLE UN-SELLING and UN-ASSIGNING A PLAYER ---
r.post("/unassign/:playerId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ _id: playerId, admin: req.user.id });
    if (!player) {
      return res
        .status(404)
        .json({ error: "Player not found or you do not have permission." });
    }

    // Reset the player's status
    player.status = "Available";
    player.soldTo = null;
    player.soldPrice = 0;
    await player.save();

    // Pull the player from any tournament pools they might be in
    await Tournament.updateMany(
      { "pools.players": playerId },
      { $pull: { "pools.$.players": playerId } }
    );

    res.json({ message: `${player.name} is now unassigned and available.` });
  } catch (e) {
    console.error("Error unassigning player:", e);
    res.status(500).json({ error: "Server error while unassigning player." });
  }
});

// DELETE /api/players/:playerId - Delete a player OWNED BY THE LOGGED-IN ADMIN
r.delete("/:playerId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ _id: playerId, admin: req.user.id });
    if (!player) {
      return res
        .status(404)
        .json({
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
