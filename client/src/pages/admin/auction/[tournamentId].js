/********************************************************************************
 * --- FILE: client/src/pages/admin/auction/[tournamentId].js (FINAL) ---
 ********************************************************************************/
// This is the complete and final code for the Admin's Auction Control Panel.
// It includes the dynamic Pool Manager, player/pool deletion, performance optimizations,
// the live bidding controls, and all styling fixes for forms.

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../../lib/api";
import { io } from "socket.io-client";
import { formatCurrency } from "../../../lib/utils";

// --- Reusable Notification Component ---
const Notification = memo(function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);
  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 transition-opacity duration-300";
  const typeClasses = type === "success" ? "bg-green-600" : "bg-red-600";
  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      {message}
      <button
        onClick={onClose}
        className="ml-4 font-bold opacity-70 hover:opacity-100"
      >
        X
      </button>
    </div>
  );
});

// --- Reusable Confirmation Modal Component ---
const ConfirmationModal = memo(function ConfirmationModal({
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 text-center w-full max-w-md">
        <p className="text-lg mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold transition-colors"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
});

// --- Reworked Currency Input Component ---
const CurrencyInput = memo(function CurrencyInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
}) {
  return (
    <div className="flex items-center relative bg-gray-700 border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-blue-500">
      <span className="pl-3 text-gray-400">₹</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={onValueChange}
        className="p-2 w-full bg-transparent border-none focus:outline-none"
      />
      <select
        value={unit}
        onChange={onUnitChange}
        className="bg-gray-600 h-full rounded-r-md px-2 text-sm appearance-none focus:outline-none"
      >
        <option>Lakhs</option>
        <option>Crores</option>
      </select>
    </div>
  );
});

// --- AddPlayerForm Component ---
const AddPlayerForm = memo(function AddPlayerForm({ onPlayerAdded }) {
  const [player, setPlayer] = useState({
    name: "",
    role: "Batter",
    nationality: "Indian",
    basePrice: { value: 20, unit: "Lakhs" },
  });
  const [msg, setMsg] = useState("");

  const handleChange = useCallback(
    (e) => setPlayer((prev) => ({ ...prev, [e.target.name]: e.target.value })),
    []
  );
  const handleBasePriceValueChange = useCallback(
    (e) =>
      setPlayer((prev) => ({
        ...prev,
        basePrice: { ...prev.basePrice, value: e.target.value },
      })),
    []
  );
  const handleBasePriceUnitChange = useCallback(
    (e) =>
      setPlayer((prev) => ({
        ...prev,
        basePrice: { ...prev.basePrice, unit: e.target.value },
      })),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      // --- THIS IS THE FIX for the string-to-number error ---
      const parseCurrency = (amount) => {
        if (!amount || typeof amount.value === "undefined" || !amount.unit)
          return 0;
        const value = parseFloat(amount.value);
        if (isNaN(value)) return 0;
        if (amount.unit === "Lakhs") return value * 100000;
        if (amount.unit === "Crores") return value * 10000000;
        return value;
      };

      const payload = {
        ...player,
        basePrice: parseCurrency(player.basePrice),
      };

      await api.players.create(payload);
      setMsg(`Successfully added ${player.name}`);
      onPlayerAdded();
      setPlayer({
        name: "",
        role: "Batter",
        nationality: "Indian",
        basePrice: { value: 20, unit: "Lakhs" },
      });
    } catch (err) {
      setMsg("Error: " + err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800 p-6 rounded-lg border border-gray-700"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-200">
        Add New Player
      </h3>
      {msg && (
        <p className="mb-2 text-sm text-center p-2 rounded-md bg-gray-700">
          {msg}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <input
          name="name"
          value={player.name}
          onChange={handleChange}
          placeholder="Player Name"
          required
          className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
        />
        <select
          name="role"
          value={player.role}
          onChange={handleChange}
          className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
        >
          <option>Batter</option>
          <option>Bowler</option>
          <option>Allrounder</option>
          <option>Wicketkeeper</option>
        </select>
        <select
          name="nationality"
          value={player.nationality}
          onChange={handleChange}
          className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
        >
          <option>Indian</option>
          <option>Overseas</option>
        </select>
        <div className="lg:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Base Price</label>
          <CurrencyInput
            value={player.basePrice.value}
            unit={player.basePrice.unit}
            onValueChange={handleBasePriceValueChange}
            onUnitChange={handleBasePriceUnitChange}
          />
        </div>
        <button
          type="submit"
          className="p-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold"
        >
          Add Player
        </button>
      </div>
    </form>
  );
});

// --- PlayerAssignmentList Component ---
const PlayerAssignmentList = memo(function PlayerAssignmentList({
  title,
  players,
  onPlayerClick,
  onDeleteClick,
  isLoading,
}) {
  return (
    <div
      className={`bg-gray-900 p-4 rounded-md h-80 flex flex-col relative ${
        isLoading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p>Updating...</p>
        </div>
      )}
      <h3 className="font-semibold mb-2 flex-shrink-0">{title}</h3>
      <ul className="space-y-1 text-sm overflow-y-auto pr-2 flex-grow">
        {players.map((p) => (
          <li
            key={p._id}
            className="flex items-center justify-between p-2 bg-gray-700 rounded group"
          >
            <span
              onClick={() => onPlayerClick(p._id)}
              className="flex-grow cursor-pointer"
            >
              {p.name} <span className="text-gray-400">({p.role})</span>
              <span className="ml-2 text-xs font-mono text-green-400">
                {formatCurrency(p.basePrice)}
              </span>
            </span>
            <button
              onClick={() => onDeleteClick(p)}
              className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

// --- PoolManager Component ---
const PoolManager = memo(function PoolManager({
  tournamentId,
  onPoolsUpdate,
  onShowConfirm,
  refreshTrigger,
}) {
  const [pools, setPools] = useState([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const refreshData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [poolsData, unassignedData] = await Promise.all([
        api.tournaments.listPools(tournamentId),
        api.players.getUnassigned(tournamentId),
      ]);
      setPools(poolsData);
      onPoolsUpdate(poolsData);
      setUnassignedPlayers(unassignedData);
      if (!selectedPoolId && poolsData.length > 0) {
        setSelectedPoolId(poolsData[0]._id);
      } else if (
        selectedPoolId &&
        !poolsData.some((p) => p._id === selectedPoolId)
      ) {
        setSelectedPoolId(poolsData.length > 0 ? poolsData[0]._id : null);
      }
    } catch (error) {
      console.error("Failed to refresh pool data:", error);
    }
  }, [tournamentId, onPoolsUpdate, selectedPoolId]);

  useEffect(() => {
    refreshData();
  }, [tournamentId, refreshTrigger, refreshData]);

  const handleCreatePool = useCallback(async () => {
    if (!newPoolName) return;
    const newPool = await api.tournaments.createPool(tournamentId, {
      name: newPoolName,
      order: pools.length,
    });
    setNewPoolName("");
    await refreshData();
    setSelectedPoolId(newPool._id);
  }, [newPoolName, tournamentId, pools.length, refreshData]);

  // --- THIS IS THE FIX for the player duplication bug ---
  const movePlayer = useCallback(
    async (playerId, fromPoolId, toPoolId) => {
      setIsMoving(true);

      const originalPools = JSON.parse(JSON.stringify(pools));
      const originalUnassigned = [...unassignedPlayers];

      // Optimistic UI Update
      if (fromPoolId === null) {
        // Moving from Unassigned to a Pool
        const playerToMove = unassignedPlayers.find((p) => p._id === playerId);
        if (playerToMove) {
          setUnassignedPlayers((prev) =>
            prev.filter((p) => p._id !== playerId)
          );
          setPools((prev) =>
            prev.map((p) =>
              p._id === toPoolId
                ? { ...p, players: [...p.players, playerToMove] }
                : p
            )
          );
        }
      } else {
        // Moving from a Pool to Unassigned
        const sourcePool = pools.find((p) => p._id === fromPoolId);
        const playerToMove = sourcePool.players.find((p) => p._id === playerId);
        if (playerToMove) {
          setPools((prev) =>
            prev.map((p) =>
              p._id === fromPoolId
                ? {
                    ...p,
                    players: p.players.filter(
                      (player) => player._id !== playerId
                    ),
                  }
                : p
            )
          );
          setUnassignedPlayers((prev) => [...prev, playerToMove]);
        }
      }

      // API Calls
      try {
        if (fromPoolId) {
          const sourcePool = originalPools.find((p) => p._id === fromPoolId);
          const updatedSourcePlayers = sourcePool.players
            .filter((p) => p._id !== playerId)
            .map((p) => p._id);
          await api.tournaments.updatePool(tournamentId, sourcePool._id, {
            players: updatedSourcePlayers,
          });
        }
        if (toPoolId) {
          const targetPool = originalPools.find((p) => p._id === toPoolId);
          const updatedTargetPlayers = [
            ...targetPool.players.map((p) => p._id),
            playerId,
          ];
          await api.tournaments.updatePool(tournamentId, targetPool._id, {
            players: updatedTargetPlayers,
          });
        }
        await refreshData(); // Refresh from server to ensure sync
      } catch (error) {
        console.error("Failed to move player:", error);
        setPools(originalPools);
        setUnassignedPlayers(originalUnassigned);
      } finally {
        setIsMoving(false);
      }
    },
    [pools, unassignedPlayers, tournamentId, refreshData]
  );

  const handleDeletePlayerRequest = useCallback(
    (player) => {
      onShowConfirm(
        `Delete player "${player.name}"? This action is permanent.`,
        async () => {
          setIsMoving(true);
          try {
            await api.players.delete(player._id);
            await refreshData();
          } catch (error) {
            console.error("Failed to delete player:", error);
          } finally {
            setIsMoving(false);
          }
        }
      );
    },
    [onShowConfirm, refreshData]
  );

  const handleDeletePoolRequest = useCallback(
    (pool) => {
      onShowConfirm(
        `Delete pool "${pool.name}"? Players will become unassigned.`,
        async () => {
          setIsMoving(true);
          try {
            await api.tournaments.deletePool(tournamentId, pool._id);
            setSelectedPoolId(null);
            await refreshData();
          } catch (error) {
            console.error("Failed to delete pool:", error);
          } finally {
            setIsMoving(false);
          }
        }
      );
    },
    [onShowConfirm, refreshData, tournamentId]
  );

  const selectedPool = pools.find((p) => p._id === selectedPoolId);

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-gray-200">
        Pool Manager
      </h2>
      <div className="flex gap-2 mb-6">
        <input
          value={newPoolName}
          onChange={(e) => setNewPoolName(e.target.value)}
          placeholder="New Pool Name"
          className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
        />
        <button
          onClick={handleCreatePool}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
        >
          Create Pool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gray-900 p-4 rounded-md">
          <h3 className="font-semibold mb-2">Pools</h3>
          <ul className="space-y-2">
            {pools.map((pool) => (
              <li
                key={pool._id}
                className="flex items-center justify-between p-2 rounded-md transition-colors bg-gray-700 hover:bg-gray-600 group"
              >
                <span
                  onClick={() => setSelectedPoolId(pool._id)}
                  className={`flex-grow cursor-pointer ${
                    selectedPoolId === pool._id ? "text-blue-400 font-bold" : ""
                  }`}
                >
                  {pool.name} ({pool.players.length})
                </span>
                <button
                  onClick={() => handleDeletePoolRequest(pool)}
                  className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {selectedPool ? (
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <PlayerAssignmentList
              title="Unassigned Players"
              players={unassignedPlayers}
              onPlayerClick={(playerId) =>
                movePlayer(playerId, null, selectedPool._id)
              }
              onDeleteClick={handleDeletePlayerRequest}
              isLoading={isMoving}
            />
            <PlayerAssignmentList
              title={`Players in ${selectedPool.name}`}
              players={selectedPool.players}
              onPlayerClick={(playerId) =>
                movePlayer(playerId, selectedPool._id, null)
              }
              onDeleteClick={handleDeletePlayerRequest}
              isLoading={isMoving}
            />
          </div>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-gray-500">
            Select or create a pool to assign players.
          </div>
        )}
      </div>
    </div>
  );
});

// --- Main AuctionControlPanel Component ---
export default function AuctionControlPanel() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournament, setTournament] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [pools, setPools] = useState([]);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [soldToTeamId, setSoldToTeamId] = useState("");
  const [bidIncrement, setBidIncrement] = useState({
    value: 50,
    unit: "Lakhs",
  });
  const socketRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((prevKey) => prevKey + 1);

  const handlePoolsUpdate = useCallback((newPools) => {
    setPools(newPools);
  }, []);
  const handleShowConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    api.tournaments.getById(tournamentId).then(setTournament);
    api.tournaments.getTeams(tournamentId).then(setTeams);

    socketRef.current = io(
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
    );
    socketRef.current.emit("join_tournament", tournamentId);
    socketRef.current.on("auction_state_update", (state) =>
      setAuctionState(state)
    );
    socketRef.current.on("squad_update", (updatedTeams) =>
      setTeams(updatedTeams)
    );

    return () => socketRef.current.disconnect();
  }, [tournamentId, router]);

  const handleBidUpdate = useCallback(
    (direction) => {
      if (!tournamentId || !auctionState?.currentPlayer) return;
      const incrementValue =
        (parseFloat(bidIncrement.value) || 0) *
        (bidIncrement.unit === "Lakhs" ? 100000 : 10000000);
      const newBid =
        direction === "up"
          ? auctionState.currentBid + incrementValue
          : Math.max(
              auctionState.currentPlayer.basePrice,
              auctionState.currentBid - incrementValue
            );
      socketRef.current.emit("admin_update_bid", { tournamentId, newBid });
    },
    [tournamentId, auctionState, bidIncrement]
  );

  const startPool = useCallback(
    async (poolId) => {
      try {
        await api.auction.startPool(tournamentId, poolId);
        setNotification({
          message: `Auction started for selected pool`,
          type: "success",
        });
      } catch (e) {
        setNotification({ message: "Error: " + e.message, type: "error" });
      }
    },
    [tournamentId]
  );

  const handleSellPlayer = useCallback(
    async (finalPrice) => {
      const { currentPlayer } = auctionState;
      if (!soldToTeamId || !finalPrice || !currentPlayer) return;
      try {
        const pricePayload = { value: finalPrice / 100000, unit: "Lakhs" };
        if (finalPrice >= 10000000) {
          pricePayload.value = finalPrice / 10000000;
          pricePayload.unit = "Crores";
        }
        await api.auction.sellPlayer(
          tournamentId,
          currentPlayer._id,
          soldToTeamId,
          pricePayload
        );
        setNotification({
          message: `${currentPlayer.name} sold successfully!`,
          type: "success",
        });
        setSoldToTeamId("");
        triggerRefresh();
      } catch (e) {
        setNotification({ message: "Error: " + e.message, type: "error" });
      }
    },
    [auctionState, soldToTeamId, tournamentId]
  );

  const handleUnsoldPlayer = useCallback(async () => {
    const { currentPlayer } = auctionState;
    if (!currentPlayer) return;
    try {
      await api.auction.unsoldPlayer(tournamentId, currentPlayer._id);
      setNotification({
        message: `${currentPlayer.name} is unsold.`,
        type: "success",
      });
      triggerRefresh();
    } catch (e) {
      setNotification({ message: "Error: " + e.message, type: "error" });
    }
  }, [auctionState, tournamentId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {confirmModal && (
        <ConfirmationModal
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400">
            Auction Control: {tournament?.title}
          </h1>
          <Link href="/admin" className="text-blue-400 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>

        <AddPlayerForm onPlayerAdded={triggerRefresh} />

        {tournamentId && (
          <PoolManager
            tournamentId={tournamentId}
            onPoolsUpdate={handlePoolsUpdate}
            onShowConfirm={handleShowConfirm}
            refreshTrigger={refreshKey}
          />
        )}

        <div className="mt-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-200">
            Start Auction
          </h2>
          <div className="flex flex-wrap gap-4">
            {pools.map((pool) => {
              const hasAvailablePlayers = pool.players.some(
                (p) => p.status === "Available"
              );
              return (
                <button
                  key={pool._id}
                  onClick={() => startPool(pool._id)}
                  disabled={pool.isCompleted || !hasAvailablePlayers}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  Start: {pool.name}
                </button>
              );
            })}
          </div>
        </div>

        {auctionState?.currentPlayer && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                Currently Bidding:{" "}
                <span className="text-white">
                  {auctionState.currentPlayer.name}
                </span>
              </h3>
              <p className="text-lg text-gray-400">
                {auctionState.currentPlayer.role} | Base Price:{" "}
                {formatCurrency(auctionState.currentPlayer.basePrice)}
              </p>

              <div className="my-6 p-4 bg-black/30 rounded-lg text-center border border-gray-600">
                <p className="text-5xl font-bold text-green-400 transition-colors duration-300">
                  {formatCurrency(auctionState.currentBid)}
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => handleBidUpdate("down")}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-bold text-2xl transition-transform transform active:scale-95"
                  >
                    -
                  </button>
                  <div className="w-48">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Increment
                    </label>
                    <CurrencyInput
                      value={bidIncrement.value}
                      unit={bidIncrement.unit}
                      onValueChange={(e) =>
                        setBidIncrement((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      onUnitChange={(e) =>
                        setBidIncrement((prev) => ({
                          ...prev,
                          unit: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleBidUpdate("up")}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-bold text-2xl transition-transform transform active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={soldToTeamId}
                  onChange={(e) => setSoldToTeamId(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                >
                  <option value="">-- Winning Team --</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  readOnly
                  value={`Final Price: ${formatCurrency(
                    auctionState.currentBid
                  )}`}
                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-center"
                />
              </div>

              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => handleSellPlayer(auctionState.currentBid)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-md font-semibold"
                >
                  Mark as Sold
                </button>
                <button
                  onClick={handleUnsoldPlayer}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-md font-semibold"
                >
                  Mark as Unsold
                </button>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold text-blue-400 mb-4">
                Upcoming in Pool
              </h3>
              <div className="space-y-2">
                {auctionState.upcomingPlayers?.map((p) => (
                  <div key={p._id} className="bg-gray-700 p-2 rounded text-sm">
                    <span className="font-semibold">{p.name}</span> ({p.role})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
