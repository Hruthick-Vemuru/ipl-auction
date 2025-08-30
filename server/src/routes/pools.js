import { Router } from "express";
import { auth } from "../middleware/auth.js";
import Pool from "../models/Pool.js";

const r = Router();

// Get all pools for a specific tournament, populated with full player details
r.get("/tournament/:tournamentId", auth, async (req, res) => {
  try {
    const pools = await Pool.find({ tournament: req.params.tournamentId })
      .populate("players")
      .sort({ order: 1 });
    res.json(pools);
  } catch (e) {
    res.status(500).json({ error: "Server error fetching pools" });
  }
});

// Admin creates a new pool
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { name, tournament, order } = req.body;
    const newPool = await Pool.create({ name, tournament, order, players: [] });
    res.status(201).json(newPool);
  } catch (e) {
    if (e.code === 11000)
      return res
        .status(409)
        .json({ error: "A pool with this name already exists." });
    res.status(500).json({ error: "Server error creating pool" });
  }
});

r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const { name, tournament, order } = req.body;
    const newPool = await Pool.create({ name, tournament, order, players: [] });

    // After creating, fetch the new full list of pools
    const allPools = await Pool.find({ tournament })
      .populate("players")
      .sort({ order: 1 });
    // Broadcast the update to all clients in the tournament room
    io.to(tournament).emit("pools_update", allPools);

    res.status(201).json(newPool);
  } catch (e) {
    if (e.code === 11000)
      return res
        .status(409)
        .json({ error: "A pool with this name already exists." });
    res.status(500).json({ error: "Server error creating pool" });
  }
});

// --- THIS IS THE UPDATED DELETE ROUTE ---
r.delete("/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const pool = await Pool.findById(req.params.poolId);
    if (!pool) return res.status(404).json({ error: "Pool not found" });
    const tournamentId = pool.tournament;

    await Pool.findByIdAndDelete(req.params.poolId);

    // After deleting, fetch the new full list of pools
    const allPools = await Pool.find({ tournament: tournamentId })
      .populate("players")
      .sort({ order: 1 });
    // Broadcast the update to all clients in the tournament room
    io.to(tournamentId).emit("pools_update", allPools);

    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Server error deleting pool" });
  }
});

export default r;
