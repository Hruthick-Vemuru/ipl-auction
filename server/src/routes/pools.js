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

// Admin updates a pool (e.g., changes its name or the players within it)
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
  try {
    await Pool.findByIdAndDelete(req.params.poolId);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "Server error deleting pool" });
  }
});

export default r;
