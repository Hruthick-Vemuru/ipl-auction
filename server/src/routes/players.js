import { Router } from "express";
import Player from "../models/Player.js";
import Pool from "../models/Pool.js"; // Import Pool to check for unassigned players
import { auth } from "../middleware/auth.js";
import { INITIAL_PURSE } from "../../config.js"; // Not used here, but good practice

// --- NEW Helper to parse the new currency format ---
const parseCurrency = (amount) => {
  if (!amount || !amount.value || !amount.unit) return 0; // Default to 0 if format is wrong
  const value = parseFloat(amount.value);
  if (isNaN(value)) return 0;
  if (amount.unit === "Lakhs") return value * 100000;
  if (amount.unit === "Crores") return value * 10000000;
  return value;
};

const r = Router();

// Get all players (can filter by status)
r.get("/", async (req, res) => {
  const { status } = req.query;
  const q = {};
  if (status) q.status = status;
  const players = await Player.find(q).sort({ name: 1 });
  res.json(players);
});

// --- NEW: Get all players NOT assigned to any pool in a specific tournament ---
r.get("/unassigned/:tournamentId", auth, async (req, res) => {
  try {
    // 1. Find all players assigned to pools in this tournament
    const pools = await Pool.find({ tournament: req.params.tournamentId });
    const assignedPlayerIds = pools.flatMap((p) => p.players);

    // 2. Find all players whose ID is NOT in the assigned list
    const unassigned = await Player.find({ _id: { $nin: assignedPlayerIds } });
    res.json(unassigned);
  } catch (e) {
    res.status(500).json({ error: "Server error fetching unassigned players" });
  }
});

// Create a new player
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const playerData = req.body;

    // --- UPDATED: Parse the basePrice object into a number ---
    const basePriceAmount = parseCurrency(playerData.basePrice);

    const newPlayer = await Player.create({
      name: playerData.name,
      role: playerData.role,
      nationality: playerData.nationality,
      basePrice: basePriceAmount, // Use the calculated number
      status: "Available",
    });
    res.status(201).json(newPlayer);
  } catch (e) {
    console.error("Error creating player:", e);
    res.status(500).json({ error: "Failed to create player" });
  }
});

r.delete("/:playerId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { playerId } = req.params;

    // 1. Remove the player's ID from any pool they are in.
    // The '$pull' operator removes all instances of a value from an array.
    await Pool.updateMany(
      { players: playerId },
      { $pull: { players: playerId } }
    );

    // 2. Delete the player document itself.
    const result = await Player.findByIdAndDelete(playerId);
    if (!result) return res.status(404).json({ error: "Player not found" });

    res.status(204).send(); // Success, no content
  } catch (e) {
    console.error("Error deleting player:", e);
    res.status(500).json({ error: "Server error while deleting player" });
  }
});

export default r;
