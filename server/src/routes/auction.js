/********************************************************************************
 * --- FILE: server/src/routes/auction.js (CORRECTED) ---
 ********************************************************************************/
// This is the complete and final version of the auction route.
// It has been rewritten to work with the new "embedded pools" data structure,
// where pools and teams are stored inside the Tournament model.

import { Router } from "express";
import Tournament from "../models/Tournament.js"; // Import Tournament, which contains pools
import Player from "../models/Player.js";
import { auth } from "../middleware/auth.js";
import { updateAndBroadcastState } from "../socket.js";

const r = Router();

// --- Helper Functions ---
const parseCurrency = (amount) => {
  if (!amount || typeof amount.value === "undefined" || !amount.unit) return 0;
  const value = parseFloat(amount.value);
  if (isNaN(value)) return 0;
  if (amount.unit === "Lakhs") return value * 100000;
  if (amount.unit === "Crores") return value * 10000000;
  return value;
};
const formatCurrency = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString()}`;
};
const getNextPlayer = async (io, tournamentId) => {
  const currentState = io.auctionState.get(tournamentId);
  if (!currentState || !currentState.currentPool) return null;
  const tournament = await Tournament.findById(tournamentId).populate(
    "pools.players"
  );
  const currentPool = tournament.pools.find(
    (p) => p.name === currentState.currentPool
  );
  if (!currentPool) return null;
  return currentPool.players.find((p) => p.status === "Available");
};
// --- End of Helper Functions ---

// Admin starts the auction for a specific pool
r.post("/start-pool", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, poolId } = req.body;
  const io = req.app.get("io");

  const tournament = await Tournament.findById(tournamentId).populate(
    "pools.players"
  );
  if (!tournament)
    return res.status(404).json({ error: "Tournament not found" });

  const pool = tournament.pools.id(poolId);
  if (!pool) return res.status(404).json({ error: "Pool not found" });

  const playersInPool = pool.players.filter((p) => p.status === "Available");
  if (playersInPool.length === 0) {
    pool.isCompleted = true;
    await tournament.save();
    updateAndBroadcastState(io, tournamentId, {
      currentPool: pool.name,
      currentPlayer: null,
      log: [
        ...(io.auctionState.get(tournamentId)?.log || []),
        `Pool "${pool.name}" is already finished.`,
      ],
    });
    return res
      .status(404)
      .json({ error: `No available players in pool: ${pool.name}` });
  }

  const firstPlayer = playersInPool.shift();
  const upcomingPlayers = playersInPool;

  updateAndBroadcastState(io, tournamentId, {
    currentPool: pool.name,
    currentPlayer: firstPlayer,
    currentBid: firstPlayer.basePrice,
    upcomingPlayers: upcomingPlayers.slice(0, 5),
    log: [
      `Auction started for ${pool.name}. First player: ${firstPlayer.name}`,
    ],
  });

  res.json({ ok: true, message: `Auction started for pool: ${pool.name}` });
});

// Admin sells a player to a team
r.post("/sell", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  // ... existing code ...
  const io = req.app.get("io");

  try {
    const tournament = await Tournament.findById(tournamentId).populate(
      "teams.players"
    );
    const player = await Player.findById(playerId);

    if (!tournament || !player)
      return res.status(404).json({ error: "Tournament or Player not found" });
    const team = tournament.teams.id(teamId);
    if (!team)
      return res
        .status(404)
        .json({ error: "Team not found in this tournament" });

    const priceAmount = parseCurrency(price);
    if (priceAmount > team.purseRemaining)
      return res.status(400).json({ error: "Team does not have enough purse" });

    // --- START OF THE FIX ---
    // 1. Check if the squad is already full
    if (team.players.length >= tournament.maxSquadSize) {
      return res.status(400).json({
        error: `${team.name} squad is full (${tournament.maxSquadSize} players).`,
      });
    }

    // 2. Check if adding this player exceeds the overseas limit
    if (player.nationality === "Overseas") {
      const overseasCount = team.players.filter(
        (p) => p.nationality === "Overseas"
      ).length;
      if (overseasCount >= tournament.maxOverseasPlayers) {
        return res.status(400).json({
          error: `${team.name} has reached the overseas player limit (${tournament.maxOverseasPlayers}).`,
        });
      }
    }

    player.soldPrice = priceAmount;
    player.soldTo = team._id;
    player.status = "Sold";
    await player.save();
    team.purseRemaining -= priceAmount;
    team.players.push(player._id);
    await tournament.save();

    const updatedTournament = await Tournament.findById(tournamentId).populate(
      "teams.players"
    );
    io.to(tournamentId).emit("squad_update", updatedTournament.teams);

    const currentState = io.auctionState.get(tournamentId);
    const nextPlayer = await getNextPlayer(io, tournamentId);
    let logMessage = `${player.name} sold to ${team.name} for ${formatCurrency(
      priceAmount
    )}.`;

    if (!nextPlayer) {
      logMessage += ` Pool "${currentState.currentPool}" is finished.`;
      const currentPool = tournament.pools.find(
        (p) => p.name === currentState.currentPool
      );
      if (currentPool) {
        currentPool.isCompleted = true;
        await tournament.save();
      }
    } else {
      logMessage += ` Next up: ${nextPlayer.name}`;
    }

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers: (
        await Tournament.findById(tournamentId).populate("pools.players")
      ).pools
        .find((p) => p.name === currentState.currentPool)
        .players.filter((p) => p.status === "Available")
        .slice(1, 6),
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /sell:", e);
    res.status(500).json({ error: "Server error during sell operation" });
  }
});

// Admin marks a player as unsold
r.post("/unsold", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, playerId } = req.body;
  const io = req.app.get("io");
  try {
    const tournament = await Tournament.findById(tournamentId);
    const player = await Player.findById(playerId);
    if (!player || !tournament)
      return res.status(404).json({ error: "Player or Tournament not found" });

    player.status = "Unsold";
    await player.save();

    const currentState = io.auctionState.get(tournamentId);
    const notificationMessage = `${player.name} is unsold.`;
    io.to(tournamentId).emit("auction_notification", {
      message: notificationMessage,
      type: "error",
    });

    const nextPlayer = await getNextPlayer(io, tournamentId);
    let logMessage = `${notificationMessage}`;

    if (!nextPlayer) {
      logMessage += ` Pool "${currentState.currentPool}" has finished.`;
      const currentPool = tournament.pools.find(
        (p) => p.name === currentState.currentPool
      );
      if (currentPool) {
        currentPool.isCompleted = true;
        await tournament.save();
      }
    } else {
      logMessage += ` Next up: ${nextPlayer.name}`;
    }

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers: (
        await Tournament.findById(tournamentId).populate("pools.players")
      ).pools
        .find((p) => p.name === currentState.currentPool)
        .players.filter((p) => p.status === "Available")
        .slice(1, 6),
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /unsold:", e);
    res.status(500).json({ error: "Server error during unsold operation" });
  }
});

export default r;
