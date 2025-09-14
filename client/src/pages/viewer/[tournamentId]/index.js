import React, { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "@/lib/api";
import { io } from "socket.io-client";
import { formatCurrency } from "@/lib/utils";

// --- Notification Component ---
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

// Re-usable PlayerCard component
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  return (
    <div
      className="relative w-56 h-14 flex items-center justify-center transition-transform hover:scale-110 group"
      style={{
        clipPath: "polygon(7% 0%, 93% 0%, 100% 50%, 93% 100%, 7% 100%, 0% 50%)",
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm group-hover:bg-black/70 transition-colors"
        style={{
          clipPath:
            "polygon(7% 0%, 93% 0%, 100% 50%, 93% 100%, 7% 100%, 0% 50%)",
        }}
      ></div>
      <div className="relative z-10 text-center p-2 w-full">
        {player.nationality === "Overseas" && (
          <div
            className="absolute top-1 right-5 text-lg"
            title="Overseas Player"
          >
            ✈️
          </div>
        )}
        <div
          className="font-bold text-base leading-tight truncate"
          style={{ color: accentColor }}
        >
          {player.name}
        </div>
        {player.soldPrice > 0 && (
          <div className="text-green-400 font-semibold text-xs mt-1">
            {formatCurrency(player.soldPrice)}
          </div>
        )}
      </div>
    </div>
  );
});

// Main Viewer Dashboard Component
export default function ViewerDashboard() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournamentData, setTournamentData] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [pools, setPools] = useState([]);
  const [activeTab, setActiveTab] = useState("auction_room");
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const VIEWER_THEME = { primary: "#111827", accent: "#D4AF37" };

  useEffect(() => {
    if (!tournamentId) return;

    const socket = io(
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
    );

    const fetchData = async () => {
      try {
        const [data, poolsData] = await Promise.all([
          api.tournaments.getPublicAnalytics(tournamentId),
          api.tournaments.getPublicPools(tournamentId),
        ]);
        setTournamentData(data);
        setPools(poolsData);
        socket.emit("join_tournament", tournamentId);
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    socket.on("connect", () => console.log("Connected to socket server!"));
    socket.on("auction_state_update", (state) => setAuctionState(state));
    socket.on("squad_update", (updatedTeams) => {
      setTournamentData((prev) => ({ ...prev, teams: updatedTeams }));
    });
    socket.on("pools_update", (updatedPools) => setPools(updatedPools));
    socket.on("auction_notification", (data) => setNotification(data));

    return () => socket.disconnect();
  }, [tournamentId]);

  const activeViewData = useMemo(() => {
    if (!tournamentData) {
      return {
        theme: VIEWER_THEME,
        header: {
          name: "Loading Tournament...",
          accent: VIEWER_THEME.accent,
          purse: null,
        },
      };
    }
    const viewedTeam = tournamentData.teams.find((t) => t._id === activeTab);
    const primaryColor = viewedTeam?.colorPrimary || VIEWER_THEME.primary;
    const accentColor = viewedTeam?.colorAccent || VIEWER_THEME.accent;
    const headerName = viewedTeam?.name || tournamentData.title;
    const purse = viewedTeam ? viewedTeam.purseRemaining : null;

    return {
      theme: { primary: primaryColor, accent: accentColor },
      header: { name: headerName, accent: accentColor, purse: purse },
    };
  }, [activeTab, tournamentData]);

  const renderContent = () => {
    if (activeTab === "auction_room") {
      return (
        <div className="space-y-6">
          {auctionState && auctionState.currentPlayer ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                  Currently Bidding
                </h3>
                <div className="text-center bg-black/50 p-8 rounded-lg">
                  <p className="text-4xl font-bold">
                    {auctionState.currentPlayer.name}
                  </p>
                  <p className="text-xl text-gray-400">
                    {auctionState.currentPlayer.role}
                  </p>
                  <p className="text-2xl font-light mt-4">
                    Base Price:{" "}
                    <span className="font-bold">
                      {formatCurrency(auctionState.currentPlayer.basePrice)}
                    </span>
                  </p>
                  <p className="text-4xl font-bold mt-4 text-green-400">
                    Current Bid: {formatCurrency(auctionState.currentBid)}
                  </p>
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <h3 className="text-2xl font-bold text-blue-400 mb-4">
                  Upcoming Players
                </h3>
                <div className="space-y-2 h-48 overflow-y-auto pr-2">
                  {auctionState.upcomingPlayers?.map((p) => (
                    <div
                      key={p._id}
                      className="bg-gray-800 p-2 rounded text-sm"
                    >
                      <span className="font-semibold">{p.name}</span>{" "}
                      <span className="text-gray-400">({p.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 bg-black/30 rounded-lg">
              Waiting for auction to start...
            </div>
          )}
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
            <h3 className="text-2xl font-bold text-gray-200 mb-4">
              Auction Pools
            </h3>
            <div className="flex flex-wrap gap-3">
              {pools.map((pool) => (
                <div
                  key={pool._id}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                    pool.isCompleted
                      ? "bg-gray-600 text-gray-400"
                      : pool.name === auctionState?.currentPool
                      ? "bg-yellow-500 text-black animate-pulse"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {pool.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const teamToShow = tournamentData.teams.find((t) => t._id === activeTab);
    if (!teamToShow) return null;

    const groupedPlayers = teamToShow.players.reduce(
      (acc, player) => {
        const role = player.role + "s";
        if (!acc[role]) acc[role] = [];
        acc[role].push(player);
        return acc;
      },
      { Batters: [], Bowlers: [], Allrounders: [], Wicketkeepers: [] }
    );

    return (
      <div className="space-y-10 bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
        {Object.entries(groupedPlayers).map(
          ([role, players]) =>
            players.length > 0 && (
              <div key={role}>
                <h3
                  className="text-3xl font-bold mb-6 text-center tracking-wider"
                  style={{ color: teamToShow.colorAccent }}
                >
                  {role}
                </h3>
                <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center">
                  {players.map((p) => (
                    <PlayerCard
                      key={p._id}
                      player={p}
                      accentColor={teamToShow.colorAccent}
                    />
                  ))}
                </div>
              </div>
            )
        )}
        {teamToShow.players.length === 0 && (
          <p className="text-center text-gray-400 py-10">
            This team has no players yet.
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading Tournament...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8 text-white transition-all duration-500"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), linear-gradient(45deg, ${activeViewData.theme.primary}, ${activeViewData.theme.accent})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1
              className="text-5xl font-bold"
              style={{ color: activeViewData.header.accent }}
            >
              {activeViewData.header.name}
            </h1>
            {activeViewData.header.purse !== null ? (
              <p className="text-white text-opacity-80 text-lg">
                Purse Remaining: {formatCurrency(activeViewData.header.purse)}
              </p>
            ) : (
              <p className="text-lg text-gray-300">Public Viewer Mode</p>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Link
              href={`/viewer/${tournamentId}/analytics`}
              className="px-4 py-2 rounded-lg font-semibold bg-blue-600/80 hover:bg-blue-600 transition-colors"
            >
              View Analytics
            </Link>
            <Link
              href="/viewer"
              className="flex items-center gap-2 px-4 py-2 bg-red-600/70 hover:bg-red-600 rounded-md font-semibold transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                  clipRule="evenodd"
                />
              </svg>
              Logout
            </Link>
          </div>
        </header>

        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("auction_room")}
            className={`px-4 py-2 font-semibold flex-shrink-0 transition-colors ${
              activeTab === "auction_room"
                ? "border-b-2 text-yellow-400 border-yellow-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Auction Room
          </button>
          {tournamentData?.teams.map((t) => (
            <button
              key={t._id}
              onClick={() => setActiveTab(t._id)}
              className={`px-4 py-2 font-semibold flex-shrink-0 transition-colors ${
                activeTab === t._id
                  ? "border-b-2 text-white border-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
}
