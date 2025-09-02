import { Router } from "express";
import { auth } from "../middleware/auth.js";
import Tournament from "../models/Tournament.js";
import Player from "../models/Player.js";
import bcrypt from "bcryptjs";
import { INITIAL_PURSE } from "../../config.js";

const parseCurrency = (amount) => {
  if (!amount || typeof amount.value === "undefined" || !amount.unit)
    return INITIAL_PURSE;
  const value = parseFloat(amount.value);
  if (isNaN(value)) return INITIAL_PURSE;
  if (amount.unit === "Lakhs") return value * 100000;
  if (amount.unit === "Crores") return value * 10000000;
  return value;
};
const r = Router();

// Create Tournament
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { title } = req.body;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tournament = await Tournament.create({
      title,
      admin: req.user.id,
      code,
    });
    res.status(201).json({ ok: true, tournament });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "You already have a tournament with this title." });
    }
    console.error("Error creating tournament:", error);
    res.status(500).json({ error: "An unexpected error occurred." });
  }
});

// Create Team (now pushes a sub-document into a tournament)
r.post("/:tournamentId/teams", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId } = req.params;
    const { name, username, password, colorPrimary, colorAccent, purse } =
      req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    if (String(tournament.admin) !== String(req.user.id))
      return res.status(403).json({ error: "Not owner" });

    // Check for duplicate username WITHIN this tournament's teams array
    if (tournament.teams.some((team) => team.username === username)) {
      return res.status(409).json({
        error: "A team with this username already exists in this tournament.",
      });
    }

    const purseAmount = parseCurrency(purse);
    const ph = await bcrypt.hash(password, 10);

    const newTeam = {
      name,
      username,
      passwordHash: ph,
      colorPrimary,
      colorAccent,
      purseRemaining: purseAmount,
      players: [],
    };

    // Use the $push operator to add the new team to the array
    tournament.teams.push(newTeam);
    await tournament.save();

    // Return the newly created team (it's the last one in the array)
    res
      .status(201)
      .json({ ok: true, team: tournament.teams[tournament.teams.length - 1] });
  } catch (error) {
    console.error("Error creating team:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

// Get Teams for a Tournament (now just returns the embedded array)
r.get("/:tournamentId/teams", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "team")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const tournament = await Tournament.findById(
      req.params.tournamentId
    ).populate("teams.players");
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    res.json(tournament.teams);
  } catch (e) {
    res.status(500).json({ error: "Server error fetching teams" });
  }
});

// Delete a specific team from a tournament
r.delete("/:tournamentId/teams/:teamId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId, teamId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    if (String(tournament.admin) !== String(req.user.id))
      return res.status(403).json({ error: "Not owner" });

    // Reset any players bought by this team
    const teamToDelete = tournament.teams.id(teamId);
    if (teamToDelete && teamToDelete.players.length > 0) {
      await Player.updateMany(
        { _id: { $in: teamToDelete.players } },
        { $set: { status: "Available", soldTo: null, soldPrice: 0 } }
      );
    }

    // Use the $pull operator to remove the team sub-document from the array
    await Tournament.updateOne(
      { _id: tournamentId },
      { $pull: { teams: { _id: teamId } } }
    );

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting team:", e);
    res
      .status(500)
      .json({ error: "An unexpected error occurred while deleting team." });
  }
});

// Get Admin's Tournaments
r.get("/my", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const tournaments = await Tournament.find({ admin: req.user.id });
  res.json(tournaments);
});

// Get Tournament info by code
r.get("/code/:code", async (req, res) => {
  const tournament = await Tournament.findOne({ code: req.params.code });
  if (!tournament)
    return res.status(404).json({ error: "Tournament not found" });
  res.json({
    id: tournament._id,
    title: tournament.title,
    active: tournament.active,
    code: tournament.code,
  });
});

// Get a single tournament by its MongoDB ID
r.get("/:tournamentId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    res.json(tournament);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a Tournament
r.delete("/:tournamentId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    if (String(tournament.admin) !== String(req.user.id))
      return res.status(403).json({ error: "Not owner" });

    const teamsInTournament = tournament.teams;
    const teamIds = teamsInTournament.map((t) => t._id);

    if (teamIds.length > 0) {
      const playerIds = teamsInTournament.flatMap((t) => t.players);
      if (playerIds.length > 0) {
        await Player.updateMany(
          { _id: { $in: playerIds } },
          { $set: { status: "Available", soldTo: null, soldPrice: 0 } }
        );
      }
    }

    await Tournament.findByIdAndDelete(tournamentId);

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting tournament:", e);
    res.status(500).json({
      error: "An unexpected error occurred while deleting the tournament.",
    });
  }
});

// Get all pools for a specific tournament
r.get("/:tournamentId/pools", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(
      req.params.tournamentId
    ).populate("pools.players");
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    res.json(tournament.pools.sort((a, b) => a.order - b.order));
  } catch (e) {
    res.status(500).json({ error: "Server error fetching pools" });
  }
});

// Admin creates a new pool in a tournament and broadcasts the change
r.post("/:tournamentId/pools", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const { tournamentId } = req.params;
    const { name, order } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    if (tournament.pools.some((p) => p.name === name)) {
      return res.status(409).json({
        error: "A pool with this name already exists in this tournament.",
      });
    }
    const newPool = { name, order, players: [] };
    tournament.pools.push(newPool);
    await tournament.save();

    const updatedTournament = await Tournament.findById(tournamentId).populate(
      "pools.players"
    );
    io.to(tournamentId).emit("pools_update", updatedTournament.pools);

    res.status(201).json(tournament.pools[tournament.pools.length - 1]);
  } catch (e) {
    res.status(500).json({ error: "Server error creating pool" });
  }
});

// Admin updates a pool's players
r.put("/:tournamentId/pools/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId, poolId } = req.params;
    const { players } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });

    const pool = tournament.pools.id(poolId);
    if (!pool) return res.status(404).json({ error: "Pool not found" });

    pool.players = players;
    await tournament.save();
    res.json(pool);
  } catch (e) {
    res.status(500).json({ error: "Server error updating pool" });
  }
});

// --- THIS IS THE REWRITTEN AND CORRECTED DELETE ROUTE ---
r.delete("/:tournamentId/pools/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const { tournamentId, poolId } = req.params;

    // Use a single, atomic operation to find the tournament and remove the pool.
    // The $pull operator is the safest way to remove an item from an array.
    const updatedTournament = await Tournament.findByIdAndUpdate(
      tournamentId,
      { $pull: { pools: { _id: poolId } } },
      { new: true } // This option returns the document *after* the update
    ).populate("pools.players");

    if (!updatedTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Broadcast the update to all clients
    io.to(tournamentId).emit("pools_update", updatedTournament.pools);

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting pool:", e);
    res.status(500).json({ error: "Server error deleting pool" });
  }
});

export default r;
