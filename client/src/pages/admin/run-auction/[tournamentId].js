/********************************************************************************
 * --- FILE: client/src/pages/admin/run-auction/[tournamentId].js (DEFINITIVE) ---
 ********************************************************************************/
// This is the complete, final, and corrected code for the live auction screen.
// It correctly displays the separate, aggregated T20 and T20I stats.

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

// --- Currency Input Component ---
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

// --- FINAL StatDisplay Component ---
const StatDisplay = ({ title, stats }) => {
  // This component is now resilient and will not crash if stats are missing.
  if (!stats || (!stats.batting && !stats.bowling)) return null;

  return (
    <div className="bg-gray-900 p-3 rounded">
      <h4 className="font-bold text-blue-400 text-md mb-2">
        {title} Career Stats
      </h4>
      {stats.batting && stats.batting.runs > 0 && (
        <div>
          <h5 className="text-xs text-gray-400 uppercase tracking-wider">
            Batting
          </h5>
          <div className="grid grid-cols-5 gap-2 text-center mt-1">
            <div>
              <div className="text-xs text-gray-500">Runs</div>
              <div className="font-bold">{stats.batting.runs}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">HS</div>
              <div className="font-bold">{stats.batting.highest_score}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">SR</div>
              <div className="font-bold">{stats.batting.strike_rate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">100s</div>
              <div className="font-bold">{stats.batting.hundreds}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">50s</div>
              <div className="font-bold">{stats.batting.fifties}</div>
            </div>
          </div>
        </div>
      )}
      {stats.bowling && stats.bowling.wickets > 0 && (
        <div className="mt-2">
          <h5 className="text-xs text-gray-400 uppercase tracking-wider">
            Bowling
          </h5>
          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            <div>
              <div className="text-xs text-gray-500">Wickets</div>
              <div className="font-bold">{stats.bowling.wickets}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Average</div>
              <div className="font-bold">{stats.bowling.average}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">SR</div>
              <div className="font-bold">{stats.bowling.strike_rate}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Collapsible Sidebar Component ---
const AuctionSidebar = ({
  pools,
  upcomingPlayers,
  onStartPool,
  isOpen,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState("pools");

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-gray-800 border-l border-gray-700 transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } w-80`}
    >
      <button
        onClick={onToggle}
        className="absolute top-1/2 -left-8 bg-gray-800 border border-gray-700 p-2 rounded-l-md"
      >
        {isOpen ? ">" : "<"}
      </button>

      <div className="p-4 h-full flex flex-col">
        <div className="flex border-b border-gray-600 mb-4">
          <button
            onClick={() => setActiveTab("pools")}
            className={`flex-1 py-2 ${
              activeTab === "pools"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
            }`}
          >
            Pools
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 ${
              activeTab === "upcoming"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          {activeTab === "pools" && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-300 px-2">
                Start a Pool
              </h3>
              {pools.map((pool) => {
                const hasAvailablePlayers = pool.players.some(
                  (p) => p.status === "Available"
                );
                return (
                  <button
                    key={pool._id}
                    onClick={() => onStartPool(pool._id)}
                    disabled={pool.isCompleted || !hasAvailablePlayers}
                    className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pool.name} {pool.isCompleted ? "(Completed)" : ""}
                  </button>
                );
              })}
            </div>
          )}
          {activeTab === "upcoming" && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-300 px-2">
                Next Players
              </h3>
              {upcomingPlayers?.map((p) => (
                <div key={p._id} className="bg-gray-700 p-2 rounded text-sm">
                  <span className="font-semibold">{p.name}</span> ({p.role})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Live Auction Page Component ---
export default function LiveAuctionPage() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournament, setTournament] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [pools, setPools] = useState([]);
  const [notification, setNotification] = useState(null);
  const [soldToTeamId, setSoldToTeamId] = useState("");
  const [bidIncrement, setBidIncrement] = useState({
    value: 50,
    unit: "Lakhs",
  });
  const socketRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api.tournaments.getById(tournamentId).then(setTournament);
    api.tournaments.getTeams(tournamentId).then(setTeams);
    api.tournaments.listPools(tournamentId).then(setPools);
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
    socketRef.current.on("pools_update", (updatedPools) =>
      setPools(updatedPools)
    );
    return () => socketRef.current.disconnect();
  }, [tournamentId, router]);

  useEffect(() => {
    if (auctionState?.currentPlayer) {
      console.log("--- CURRENT PLAYER DATA RECEIVED ---");
      console.log("Full Player Object:", auctionState.currentPlayer);
      console.log("Player STATS Object:", auctionState.currentPlayer.stats);
      console.log("------------------------------------");
    }
  }, [auctionState?.currentPlayer]);

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
    } catch (e) {
      setNotification({ message: "Error: " + e.message, type: "error" });
    }
  }, [auctionState, tournamentId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <main
        className={`flex-grow p-4 md:p-8 transition-all duration-300 ${
          isSidebarOpen ? "pr-80" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-blue-400">
              Live Auction: {tournament?.title}
            </h1>
            <Link
              href={`/admin/auction/${tournamentId}`}
              className="text-blue-400 hover:underline"
            >
              &larr; Back to Control Room
            </Link>
          </div>

          {auctionState?.currentPlayer ? (
            <div className="mt-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <img
                  src={auctionState.currentPlayer.image_path}
                  alt={auctionState.currentPlayer.name}
                  className="w-48 h-48 rounded-full border-4 border-yellow-400 object-cover"
                />
                <div className="flex-grow w-full">
                  <h3 className="text-4xl font-bold text-yellow-400">
                    {auctionState.currentPlayer.name}
                  </h3>
                  <p className="text-xl text-gray-300 mt-1">
                    {auctionState.currentPlayer.role} |{" "}
                    {auctionState.currentPlayer.nationality}
                  </p>
                  {auctionState.currentPlayer.battingstyle && (
                    <p className="text-md text-gray-400">
                      ({auctionState.currentPlayer.battingstyle})
                    </p>
                  )}
                  <p className="text-lg text-gray-400 mt-2">
                    Base Price:{" "}
                    <strong>
                      {formatCurrency(auctionState.currentPlayer.basePrice)}
                    </strong>
                  </p>

                  <div className="mt-4 space-y-3">
                    <StatDisplay
                      title="T20I"
                      stats={auctionState.currentPlayer.stats?.T20I}
                    />
                    <StatDisplay
                      title="T20"
                      stats={auctionState.currentPlayer.stats?.T20}
                    />
                  </div>
                </div>
              </div>

              <div className="my-6 p-4 bg-black/30 rounded-lg text-center border border-gray-600">
                <p className="text-6xl font-bold text-green-400 transition-colors duration-300">
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
          ) : (
            <div className="text-center text-gray-500 py-20 bg-gray-800 rounded-lg">
              <h2 className="text-3xl">Waiting for Auction to Start</h2>
              <p className="mt-2">
                Use the sidebar to select a pool and start the auction.
              </p>
            </div>
          )}
        </div>
      </main>

      <AuctionSidebar
        pools={pools}
        upcomingPlayers={auctionState?.upcomingPlayers}
        onStartPool={startPool}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
  );
}
