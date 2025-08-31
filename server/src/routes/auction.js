/********************************************************************************
 * --- FILE: server/src/routes/auction.js (FINAL CORRECTED) ---
 ********************************************************************************/
// FINAL VERSION: The logic for the '/sell' and '/unsold' routes has been
// rewritten. It now correctly recalculates the list of upcoming players after
// each action, ensuring the UI is always accurate for all users.

import { Router } from "express";
import Tournament from "../models/Tournament.js";
import Player from "../models/Player.js";
import Pool from "../models/Pool.js";
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
// --- End of Helper Functions ---

// Admin starts the auction for a specific pool
r.post("/start-pool", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, poolId } = req.body;
  const io = req.app.get("io");

  const pool = await Pool.findById(poolId).populate("players");
  if (!pool) return res.status(404).json({ error: "Pool not found" });

  const playersInPool = pool.players.filter((p) => p.status === "Available");
  if (playersInPool.length === 0) {
    pool.isCompleted = true;
    await pool.save();
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

// --- THIS IS THE CORRECTED AND COMPLETED ROUTE ---
r.post("/sell", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, playerId, teamId, price } = req.body;
  const io = req.app.get("io");

  try {
    const tournament = await Tournament.findById(tournamentId);
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

    // RECALCULATE the upcoming players list AFTER the sale
    const currentPool = await Pool.findOne({
      tournament: tournamentId,
      name: currentState.currentPool,
    }).populate("players");
    const upcomingPlayers = currentPool.players.filter(
      (p) => p.status === "Available"
    );

    const nextPlayer = upcomingPlayers.shift(); // The actual next player
    let logMessage = `${player.name} sold to ${team.name} for ${formatCurrency(
      priceAmount
    )}.`;

    if (!nextPlayer) {
      logMessage += ` Pool "${currentState.currentPool}" has finished.`;
      currentPool.isCompleted = true;
      await currentPool.save();
    } else {
      logMessage += ` Next up: ${nextPlayer.name}`;
    }

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers: upcomingPlayers.slice(0, 5), // Send the new, correct upcoming list
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /sell:", e);
    res.status(500).json({ error: "Server error during sell operation" });
  }
});

// --- THIS IS THE CORRECTED AND COMPLETED ROUTE ---
r.post("/unsold", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, playerId } = req.body;
  const io = req.app.get("io");
  try {
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    player.status = "Unsold";
    await player.save();

    const currentState = io.auctionState.get(tournamentId);
    const notificationMessage = `${player.name} is unsold.`;
    io.to(tournamentId).emit("auction_notification", {
      message: notificationMessage,
      type: "error",
    });

    // RECALCULATE the upcoming players list AFTER marking as unsold
    const currentPool = await Pool.findOne({
      tournament: tournamentId,
      name: currentState.currentPool,
    }).populate("players");
    const upcomingPlayers = currentPool.players.filter(
      (p) => p.status === "Available"
    );

    const nextPlayer = upcomingPlayers.shift();
    let logMessage = `${notificationMessage}`;

    if (!nextPlayer) {
      logMessage += ` Pool "${currentState.currentPool}" has finished.`;
      currentPool.isCompleted = true;
      await currentPool.save();
    } else {
      logMessage += ` Next up: ${nextPlayer.name}`;
    }

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers: upcomingPlayers.slice(0, 5), // Send the new, correct upcoming list
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /unsold:", e);
    res.status(500).json({ error: "Server error during unsold operation" });
  }
});

export default r;
