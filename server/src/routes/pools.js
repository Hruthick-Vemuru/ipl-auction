import { Router } from "express";
import { auth } from "../middleware/auth.js";
import Pool from "../models/Pool.js";

const r = Router();

// Get all pools for a specific tournament
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

// Admin updates a pool
r.put("/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { name, order, players } = req.body;
    const updatedPool = await Pool.findByIdAndUpdate(
      req.params.poolId,
      { name, order, players },
      { new: true }
    );
    res.json(updatedPool);
  } catch (e) {
    res.status(500).json({ error: "Server error updating pool" });
  }
});

r.delete("/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const pool = await Pool.findById(req.params.poolId);
    if (!pool) return res.status(404).json({ error: "Pool not found" });
    const tournamentId = pool.tournament;

    await Pool.findByIdAndDelete(req.params.poolId);

    // --- NEW: BROADCAST THE UPDATE ---
    // After deleting, fetch the new full list of pools for the tournament.
    const allPools = await Pool.find({ tournament: tournamentId })
      .populate("players")
      .sort({ order: 1 });
    // Broadcast the update to all clients in the tournament room.
    io.to(tournamentId.toString()).emit("pools_update", allPools);

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting pool:", e);
    res.status(500).json({ error: "Server error deleting pool" });
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
