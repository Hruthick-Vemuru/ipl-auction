import { Router } from "express";
import Tournament from "../models/Tournament.js";
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
      .status(400)
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

// Admin sells a player to a team - REWRITTEN FOR STABILITY
r.post("/sell", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, playerId, teamId, price } = req.body;
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
      return res.status(404).json({ error: "Team not found in tournament" });

    const priceAmount = parseCurrency(price);

    // All validations
    if (priceAmount > team.purseRemaining)
      return res.status(400).json({ error: "Team does not have enough purse" });
    if (team.players.length >= tournament.maxSquadSize)
      return res.status(400).json({ error: `${team.name} squad is full.` });
    if (player.nationality === "Overseas") {
      const overseasCount = team.players.filter(
        (p) => p.nationality === "Overseas"
      ).length;
      if (overseasCount >= tournament.maxOverseasPlayers)
        return res
          .status(400)
          .json({ error: `${team.name} has reached overseas player limit.` });
    }

    // --- Perform Atomic Database Updates ---
    await Player.findByIdAndUpdate(playerId, {
      status: "Sold",
      soldPrice: priceAmount,
      soldTo: teamId,
    });
    await Tournament.updateOne(
      { _id: tournamentId, "teams._id": teamId },
      {
        $inc: { "teams.$.purseRemaining": -priceAmount },
        $push: { "teams.$.players": playerId },
      }
    );

    // --- Determine Next State and Broadcast ---
    const currentState = io.auctionState.get(tournamentId);
    const tournamentForNextPlayer = await Tournament.findById(
      tournamentId
    ).populate("pools.players");
    const currentPool = tournamentForNextPlayer.pools.find(
      (p) => p.name === currentState.currentPool
    );

    let nextPlayer = null;
    let upcomingPlayers = [];
    if (currentPool) {
      const remainingPlayers = currentPool.players.filter(
        (p) => p.status === "Available"
      );
      if (remainingPlayers.length > 0) {
        nextPlayer = remainingPlayers[0];
        upcomingPlayers = remainingPlayers.slice(1, 6);
      } else {
        await Tournament.updateOne(
          { _id: tournamentId, "pools._id": currentPool._id },
          { $set: { "pools.$.isCompleted": true } }
        );
      }
    }

    const logMessage = `${player.name} sold to ${
      team.name
    } for ${formatCurrency(priceAmount)}. ${
      nextPlayer
        ? `Next up: ${nextPlayer.name}`
        : `Pool "${currentState.currentPool}" is finished.`
    }`;

    // --- Broadcast all updates to clients ---
    const updatedTournamentForBroadcast = await Tournament.findById(
      tournamentId
    ).populate("teams.players");

    io.to(tournamentId).emit(
      "squad_update",
      updatedTournamentForBroadcast.teams
    );
    io.to(tournamentId).emit(
      "pools_update",
      updatedTournamentForBroadcast.pools
    );

    // --- THIS IS THE NOTIFICATION EMIT FOR SOLD PLAYERS ---
    io.to(tournamentId).emit("auction_notification", {
      message: `${player.name} sold to ${team.name} for ${formatCurrency(
        priceAmount
      )}`,
      type: "success",
    });

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers,
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /sell route:", e);
    res.status(500).json({ error: "Server error during sell operation." });
  }
});

// Admin marks a player as unsold - REWRITTEN FOR STABILITY
r.post("/unsold", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  const { tournamentId, playerId } = req.body;
  const io = req.app.get("io");
  try {
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    // --- Perform Atomic Database Update ---
    await Player.findByIdAndUpdate(playerId, { status: "Unsold" });

    // --- Determine Next State and Broadcast ---
    const currentState = io.auctionState.get(tournamentId);
    const tournamentForNextPlayer = await Tournament.findById(
      tournamentId
    ).populate("pools.players");
    const currentPool = tournamentForNextPlayer.pools.find(
      (p) => p.name === currentState.currentPool
    );

    let nextPlayer = null;
    let upcomingPlayers = [];
    if (currentPool) {
      const remainingPlayers = currentPool.players.filter(
        (p) => p.status === "Available"
      );
      if (remainingPlayers.length > 0) {
        nextPlayer = remainingPlayers[0];
        upcomingPlayers = remainingPlayers.slice(1, 6);
      } else {
        await Tournament.updateOne(
          { _id: tournamentId, "pools._id": currentPool._id },
          { $set: { "pools.$.isCompleted": true } }
        );
      }
    }

    const logMessage = `${player.name} is unsold. ${
      nextPlayer
        ? `Next up: ${nextPlayer.name}`
        : `Pool "${currentState.currentPool}" has finished.`
    }`;

    // --- THIS IS THE NOTIFICATION EMIT FOR UNSOLD PLAYERS ---
    io.to(tournamentId).emit("auction_notification", {
      message: `${player.name} is unsold.`,
      type: "error",
    });

    const updatedPoolsForBroadcast = await Tournament.findById(
      tournamentId
    ).populate("pools.players");
    io.to(tournamentId).emit("pools_update", updatedPoolsForBroadcast.pools);

    updateAndBroadcastState(io, tournamentId, {
      currentPlayer: nextPlayer,
      currentBid: nextPlayer ? nextPlayer.basePrice : 0,
      upcomingPlayers,
      log: [...(currentState.log || []), logMessage],
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Error in /unsold:", e);
    res.status(500).json({ error: "Server error during unsold operation" });
  }
});

export default r;
