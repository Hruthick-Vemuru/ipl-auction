import { Router } from "express";
import Player from "../models/Player.js";
import Tournament from "../models/Tournament.js";
import { auth } from "../middleware/auth.js";

const parseCurrency = (amount) => {
  if (!amount || typeof amount.value === "undefined" || !amount.unit) return 0;
  const value = parseFloat(amount.value);
  if (isNaN(value)) return 0;
  if (amount.unit === "Lakhs") return value * 100000;
  if (amount.unit === "Crores") return value * 10000000;
  return value;
};

const r = Router();

// Get unassigned players (now ONLY returns unassigned players owned by the logged-in admin)
r.get("/unassigned/:tournamentId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });

    // Ensure the admin owns this tournament before proceeding
    if (String(tournament.admin) !== String(req.user.id)) {
      return res.status(403).json({ error: "You do not own this tournament." });
    }

    const assignedPlayerIds = tournament.pools.flatMap((p) => p.players);

    // --- THIS IS THE KEY SECURITY FIX ---
    // Find all players where the admin ID matches the logged-in user,
    // AND the player's ID is not in the assigned list.
    const unassigned = await Player.find({
      admin: req.user.id,
      _id: { $nin: assignedPlayerIds },
    }).sort({ name: 1 });

    res.json(unassigned);
  } catch (e) {
    console.error("Error fetching unassigned players:", e);
    res.status(500).json({ error: "Server error fetching unassigned players" });
  }
});

// Create a new player (now correctly saves the admin's ID)
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const playerData = req.body;
    const basePriceAmount = parseCurrency(playerData.basePrice);

    const newPlayer = await Player.create({
      name: playerData.name,
      role: playerData.role,
      nationality: playerData.nationality,
      admin: req.user.id, // Save the owner's ID
      basePrice: basePriceAmount,
      status: "Available",
    });
    res.status(201).json(newPlayer);
  } catch (e) {
    console.error("Error creating player:", e);
    res.status(500).json({ error: "Failed to create player" });
  }
});

// Delete a player (now correctly checks for ownership before deleting)
r.delete("/:playerId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { playerId } = req.params;

    // --- THIS IS THE KEY SECURITY FIX ---
    // Find the player by its ID AND the logged-in admin's ID.
    // This makes it impossible for one admin to delete another's player.
    const player = await Player.findOne({ _id: playerId, admin: req.user.id });
    if (!player) {
      return res
        .status(404)
        .json({
          error: "Player not found or you do not have permission to delete it.",
        });
    }

    // Pull the player from any pools they might be in
    await Tournament.updateMany(
      { "pools.players": playerId },
      { $pull: { "pools.$.players": playerId } }
    );

    await Player.findByIdAndDelete(playerId);
    res.status(204).send();
  } catch (e) {
    console.error("Error deleting player:", e);
    res.status(500).json({ error: "Server error while deleting player" });
  }
});

export default r;
