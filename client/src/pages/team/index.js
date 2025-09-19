import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken, setToken } from "@/lib/api";
import { io } from "socket.io-client";
import { formatCurrency, getTextColorForBackground } from "@/lib/utils";

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

// --- FINAL, RESPONSIVE PlayerCard Component ---
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  // Function to determine the best font size class based on name length
  const getNameSizeClass = (name) => {
    if (name.length > 18) {
      return "text-base"; // Smaller font for very long names
    }
    if (name.length > 12) {
      return "text-lg"; // Medium font for medium names
    }
    return "text-xl"; // Larger font for shorter names
  };

  return (
    <div className="relative w-80 h-24 group transform transition-transform hover:scale-105">
      {/* The shaped background */}
      <div
        className="absolute inset-0 bg-gray-800 bg-opacity-60 backdrop-blur-sm border border-gray-700 group-hover:bg-gray-700/80 transition-all duration-300"
        style={{
          clipPath: "polygon(0% 0%, 100% 0%, 90% 100%, 0% 100%)",
        }}
      />

      {/* Content */}
      <div className="relative flex items-center h-full p-2 text-white">
        {/* Player Image */}
        <img
          src={player.image_path}
          alt={player.name}
          className="w-20 h-20 object-cover rounded-full flex-shrink-0 border-2"
          style={{ borderColor: accentColor }}
        />

        {/* Player Info */}
        <div className="ml-4 flex-grow overflow-hidden">
          <p
            className={`font-bold leading-tight truncate ${getNameSizeClass(
              player.name
            )}`}
            style={{ color: accentColor }}
          >
            {player.name}
          </p>
          {player.soldPrice > 0 && (
            <p className="text-green-400 font-semibold text-lg mt-1">
              {formatCurrency(player.soldPrice)}
            </p>
          )}
        </div>

        {/* Overseas Icon */}
        {player.nationality !== "Indian" && (
          <div
            className="absolute top-2 right-4 text-2xl"
            title="Overseas Player"
          >
            ✈️
          </div>
        )}
      </div>
    </div>
  );
});

// --- StatDisplay Component ---
const StatDisplay = ({ title, stats }) => {
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

// --- Main TeamDashboard Component ---
export default function TeamDashboard() {
  const router = useRouter();
  const [myTeam, setMyTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [pools, setPools] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const handleLogout = useCallback(() => {
    setToken(null);
    router.push("/");
  }, [router]);

  const handleStopImpersonating = useCallback(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("originalAdminToken");
      if (adminToken) {
        setToken(adminToken); // Restore the admin token
        localStorage.removeItem("originalAdminToken"); // Clean up
        router.push("/admin"); // Go back to the admin dashboard
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("originalAdminToken");
      if (adminToken) {
        setIsImpersonating(true);
      }
    }

    const token = getToken();
    if (!token) {
      router.push("/team/login");
      return;
    }

    const socket = io(
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
    );

    const fetchData = async () => {
      try {
        const myTeamData = await api.auth.me();
        if (!myTeamData || !myTeamData.tournament) {
          throw new Error(
            "Your team data is incomplete. Please contact the administrator."
          );
        }
        setMyTeam(myTeamData);
        setActiveTab(myTeamData._id);

        const tournamentId = myTeamData.tournament;

        const [allTeamsData, poolsData] = await Promise.all([
          api.tournaments.getTeams(tournamentId),
          api.tournaments.listPools(tournamentId),
        ]);
        setAllTeams(allTeamsData);
        setPools(poolsData);

        socket.emit("join_tournament", tournamentId);
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    socket.on("connect", () => console.log("Connected to socket server!"));
    socket.on("auction_state_update", (state) => setAuctionState(state));

    socket.on("squad_update", (updatedTeams) => {
      setAllTeams(updatedTeams);
      setMyTeam((currentMyTeam) => {
        if (!currentMyTeam) return null;
        const myUpdatedTeam = updatedTeams.find(
          (t) => t._id === currentMyTeam._id
        );
        return myUpdatedTeam || currentMyTeam;
      });
    });

    socket.on("pools_update", (updatedPools) => {
      setPools(updatedPools);
    });

    socket.on("auction_notification", (data) => {
      setNotification(data);
    });

    return () => socket.disconnect();
  }, [router]);

  const activeViewData = useMemo(() => {
    if (!myTeam || !activeTab)
      return {
        theme: { primary: "#000", accent: "#FFF" },
        header: { name: "Loading...", purse: 0, accent: "#FFF" },
        isMyTeamView: true,
      };

    const viewedTeam = allTeams.find((t) => t._id === activeTab);

    if (activeTab === "auction_room" || !viewedTeam) {
      return {
        theme: { primary: myTeam.colorPrimary, accent: myTeam.colorAccent },
        header: {
          name: myTeam.name,
          purse: myTeam.purseRemaining,
          accent: myTeam.colorAccent,
        },
        isMyTeamView: true,
      };
    }

    return {
      theme: {
        primary: viewedTeam.colorPrimary,
        accent: viewedTeam.colorAccent,
      },
      header: {
        name: viewedTeam.name,
        purse: viewedTeam.purseRemaining,
        accent: viewedTeam.colorAccent,
      },
      isMyTeamView: viewedTeam._id === myTeam._id,
    };
  }, [activeTab, allTeams, myTeam]);

  const displayedTeamData = useMemo(() => {
    if (activeTab === "auction_room" || !allTeams.length) return null;
    const teamToShow = allTeams.find((t) => t._id === activeTab);
    if (!teamToShow || !teamToShow.players)
      return { team: teamToShow, groupedPlayers: {} };
    const grouped = teamToShow.players.reduce(
      (acc, player) => {
        const role = player.role + "s";
        if (!acc[role]) acc[role] = [];
        acc[role].push(player);
        return acc;
      },
      { Batters: [], Bowlers: [], Allrounders: [], Wicketkeepers: [] }
    );
    return { team: teamToShow, groupedPlayers: grouped };
  }, [activeTab, allTeams]);

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
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <h3 className="text-2xl font-bold text-blue-400 mb-4">
                  Upcoming Players
                </h3>
                <div className="space-y-2">
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

    if (!displayedTeamData)
      return (
        <div className="text-center text-gray-500 py-10">
          Select a team to view their squad.
        </div>
      );
    const { team, groupedPlayers } = displayedTeamData;

    return (
      <div className="space-y-10 bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
        {Object.entries(groupedPlayers).map(
          ([role, players]) =>
            players.length > 0 && (
              <div key={role}>
                <h3
                  className="text-3xl font-bold mb-6 text-center tracking-wider"
                  style={{ color: team.colorAccent }}
                >
                  {role}
                </h3>
                <div className="flex flex-wrap gap-4 justify-center">
                  {players.map((p) => (
                    <PlayerCard
                      key={p._id}
                      player={p}
                      accentColor={team.colorAccent}
                    />
                  ))}
                </div>
              </div>
            )
        )}
        {team.players.length === 0 && (
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
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-bold mb-4">An Error Occurred</h2>
        <p className="text-red-200 bg-red-800 p-4 rounded-md">{error}</p>
        <p className="mt-4 text-red-300">Please try logging in again.</p>
      </div>
    );
  }

  if (!myTeam) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Initializing...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8 text-white transition-all duration-500"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), linear-gradient(45deg, ${activeViewData.theme.primary}, ${activeViewData.theme.accent})`,
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
            <p className="text-white text-opacity-80 text-lg">
              Purse Remaining: {formatCurrency(activeViewData.header.purse)}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {myTeam.tournament && (
              <Link
                href={`/team/analytics/${myTeam.tournament}`}
                className="px-4 py-2 rounded-lg font-semibold bg-blue-600/80 hover:bg-blue-600 transition-colors"
              >
                View Analytics
              </Link>
            )}
            {isImpersonating ? (
              <button
                onClick={handleStopImpersonating}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-md font-semibold transition-colors hover:bg-yellow-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                Return to Admin
              </button>
            ) : (
              <>
                {activeViewData.isMyTeamView && (
                  <Link
                    href="/team/submission"
                    className="px-4 py-2 rounded-lg font-semibold transition-transform transform hover:scale-105 border-2"
                    style={{
                      borderColor: activeViewData.header.accent,
                      color: activeViewData.header.accent,
                    }}
                  >
                    Squad Submission
                  </Link>
                )}
                <button
                  onClick={handleLogout}
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
                </button>
              </>
            )}
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
          {allTeams.map((t) => (
            <button
              key={t._id}
              onClick={() => setActiveTab(t._id)}
              className={`px-4 py-2 font-semibold flex-shrink-0 transition-colors ${
                activeTab === t._id
                  ? "border-b-2 text-white border-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t._id === myTeam?._id ? "My Squad" : t.name}
            </button>
          ))}
        </div>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
}
