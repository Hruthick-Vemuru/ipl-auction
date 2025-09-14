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

// --- PROTECTED ADMIN ROUTES ---

// Create Tournament
r.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { title, minSquadSize, maxSquadSize, maxOverseasPlayers } = req.body;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tournament = await Tournament.create({
      title,
      admin: req.user.id,
      code,
      teams: [],
      pools: [],
      minSquadSize,
      maxSquadSize,
      maxOverseasPlayers,
    });
    res.status(201).json({ ok: true, tournament });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "A tournament with this title already exists." });
    }
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
  }
});

// Create Team in a Tournament
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

    tournament.teams.push(newTeam);
    await tournament.save();

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

// Get Teams for a Tournament (for admin/team)
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

// Update a specific team in a tournament
r.put("/:tournamentId/teams/:teamId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId, teamId } = req.params;
    const { name, username, password, colorPrimary, colorAccent, purse } =
      req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });
    if (String(tournament.admin) !== String(req.user.id))
      return res.status(403).json({ error: "Not owner" });

    const team = tournament.teams.id(teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.name = name;
    team.username = username;
    team.colorPrimary = colorPrimary;
    team.colorAccent = colorAccent;
    team.purseRemaining = parseCurrency(purse);

    if (password) {
      team.passwordHash = await bcrypt.hash(password, 10);
    }

    await tournament.save();
    res.json({ ok: true, team });
  } catch (error) {
    console.error("Error updating team:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred on the server." });
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

    const teamToDelete = tournament.teams.id(teamId);
    if (teamToDelete && teamToDelete.players.length > 0) {
      await Player.updateMany(
        { _id: { $in: teamToDelete.players } },
        { $set: { status: "Available", soldTo: null, soldPrice: 0 } }
      );
    }

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

// --- THIS IS THE CORRECTED ROUTE ---
// Get a single tournament by ID (for admins OR a team member of that tournament)
r.get("/:tournamentId", auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // A user is authorized if they are the admin of this tournament OR a team member within it.
    const isAdminOwner =
      req.user.role === "admin" &&
      String(tournament.admin) === String(req.user.id);
    const isTeamMemberOfTournament =
      req.user.role === "team" &&
      String(req.user.tournamentId) === String(tournament._id);

    if (!isAdminOwner && !isTeamMemberOfTournament) {
      return res
        .status(403)
        .json({
          error: "You are not authorized to view this tournament's details.",
        });
    }

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

// Get all pools for a specific tournament (admin/team only)
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

// Admin creates a new pool in a tournament
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

// Delete a pool from a tournament
r.delete("/:tournamentId/pools/:poolId", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const io = req.app.get("io");
  try {
    const { tournamentId, poolId } = req.params;

    const updatedTournament = await Tournament.findByIdAndUpdate(
      tournamentId,
      { $pull: { pools: { _id: poolId } } },
      { new: true }
    ).populate("pools.players");

    if (!updatedTournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    io.to(tournamentId).emit("pools_update", updatedTournament.pools);

    res.status(204).send();
  } catch (e) {
    console.error("Error deleting pool:", e);
    res.status(500).json({ error: "Server error deleting pool" });
  }
});

// --- PUBLIC ROUTES (No auth needed) ---

// Get Tournament info by code (for team login page)
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

// Public route to get a tournament by its code
r.get("/public/code/:code", async (req, res) => {
  try {
    const tournament = await Tournament.findOne({
      code: req.params.code.toUpperCase(),
      active: true,
    }).select("_id");
    if (!tournament) {
      return res.status(404).json({ error: "Active tournament not found" });
    }
    res.json(tournament);
  } catch (e) {
    res.status(500).json({ error: "Server error fetching tournament by code" });
  }
});

// Public route for analytics
r.get("/public/analytics/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId).populate({
      path: "teams",
      populate: {
        path: "players",
        model: "Player",
      },
    });
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });

    res.json(tournament);
  } catch (e) {
    console.error("Error fetching public analytics data:", e);
    res.status(500).json({ error: "An unexpected server error occurred." });
  }
});

// Public route for fetching pools
r.get("/public/:tournamentId/pools", async (req, res) => {
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

export default r;
