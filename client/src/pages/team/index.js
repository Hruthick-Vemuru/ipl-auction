import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken, setToken } from "@/lib/api";
import { io } from "socket.io-client";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- NEW: Celebration Component (copied from run-auction) ---
const SoldCelebration = ({ player, team, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 7000); // Auto-dismiss after 7 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  const confetti = Array.from({ length: 100 });

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {confetti.map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: Math.random() * 10 + 5,
              height: Math.random() * 10 + 5,
              background: i % 2 === 0 ? team.colorPrimary : team.colorAccent,
              top: `${Math.random() * -50}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: "120vh",
              x: Math.random() * 200 - 100,
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: Math.random() * 3 + 4,
              ease: "linear",
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        className="text-center flex flex-col items-center"
        initial={{ scale: 0.5, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
      >
        <img
          src={player.image_path}
          alt={player.name}
          className="w-64 h-64 rounded-full border-8 border-yellow-400 object-cover shadow-2xl"
        />
        <h2
          className="text-6xl font-bold mt-4"
          style={{ color: team.colorAccent }}
        >
          {player.name}
        </h2>
        <p className="text-4xl font-semibold text-green-400 mt-2">
          {formatCurrency(player.soldPrice)}
        </p>
        <p className="text-2xl text-white mt-2">SOLD TO</p>
        <div className="flex items-center gap-4 mt-2">
          <img src={team.logo} alt={team.name} className="h-16" />
          <h3 className="text-4xl font-bold">{team.name}</h3>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Enhanced Notification Component ---
const Notification = memo(function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);

  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-xl shadow-xl text-white text-sm z-50 backdrop-blur-md border";
  const typeClasses =
    type === "success"
      ? "bg-emerald-500/20 border-emerald-500"
      : "bg-rose-500/20 border-rose-500";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className={`${baseClasses} ${typeClasses}`}
      >
        <div className="flex items-center">
          <div className="mr-3">
            {type === "success" ? (
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-rose-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-4 font-bold opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// --- NEW Perfected PlayerCard Component ---
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative h-24 bg-gradient-to-b from-gray-900/80 to-gray-950/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/5 group hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex-shrink-0 max-w-xs"
    >
      <div className="absolute -top-8 left-0 w-24 h-24">
        <div className="relative w-full h-full z-10">
          <img
            src={player.image_path}
            alt={player.name}
            className="w-full h-full object-cover rounded-full shadow-xl"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      <div className="flex flex-col text-right items-end justify-center h-full pl-20">
        <p className="font-bold text-xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-white truncate">
          {player.name}
        </p>
        {player.soldPrice > 0 && (
          <p className="font-semibold text-2xl mt-1 text-emerald-400">
            {formatCurrency(player.soldPrice)}
          </p>
        )}
      </div>

      {player.nationality !== "Indian" && (
        <div
          className="absolute top-2 right-2 text-2xl"
          title="Overseas Player"
        >
          ✈️
        </div>
      )}
    </motion.div>
  );
});

// --- Enhanced StatDisplay Component ---
const StatDisplay = ({ title, stats }) => {
  if (!stats || (!stats.batting && !stats.bowling)) return null;

  return (
    <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
      <h4 className="font-bold text-blue-400 text-md mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
            clipRule="evenodd"
          />
        </svg>
        {title} Career Stats
      </h4>
      {stats.batting && stats.batting.runs > 0 && (
        <div>
          <h5 className="text-xs text-gray-400 uppercase tracking-wider flex items-center mb-2">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                clipRule="evenodd"
              />
            </svg>
            Batting
          </h5>
          <div className="grid grid-cols-5 gap-2 text-center mt-1">
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">Runs</div>
              <div className="font-bold text-white">{stats.batting.runs}</div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">HS</div>
              <div className="font-bold text-white">
                {stats.batting.highest_score}
              </div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">SR</div>
              <div className="font-bold text-white">
                {stats.batting.strike_rate}
              </div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">100s</div>
              <div className="font-bold text-white">
                {stats.batting.hundreds}
              </div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">50s</div>
              <div className="font-bold text-white">
                {stats.batting.fifties}
              </div>
            </div>
          </div>
        </div>
      )}
      {stats.bowling && stats.bowling.wickets > 0 && (
        <div className="mt-3">
          <h5 className="text-xs text-gray-400 uppercase tracking-wider flex items-center mb-2">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            Bowling
          </h5>
          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">Wickets</div>
              <div className="font-bold text-white">
                {stats.bowling.wickets}
              </div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">Average</div>
              <div className="font-bold text-white">
                {stats.bowling.average}
              </div>
            </div>
            <div className="bg-black/30 p-2 rounded-lg">
              <div className="text-xs text-gray-500">SR</div>
              <div className="font-bold text-white">
                {stats.bowling.strike_rate}
              </div>
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
  const [celebrationData, setCelebrationData] = useState(null);

  const [squadRoleTab, setSquadRoleTab] = useState("Batters");

  const handleLogout = useCallback(() => {
    setToken(null);
    router.push("/");
  }, [router]);

  const handleStopImpersonating = useCallback(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("originalAdminToken");
      if (adminToken) {
        setToken(adminToken);
        localStorage.removeItem("originalAdminToken");
        router.push("/admin");
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
      if (data.type === "sold" && data.team._id === myTeam?._id) {
        setCelebrationData({ player: data.player, team: data.team });
      }
    });

    return () => socket.disconnect();
  }, [router, myTeam?._id]);

  const activeViewData = useMemo(() => {
    if (!myTeam || !activeTab)
      return {
        theme: { primary: "#000", accent: "#FFF" },
        header: { name: "Loading...", purse: 0, accent: "#FFF" },
        isMyTeamView: true,
        team: null,
      };

    const viewedTeam = allTeams.find((t) => t._id === activeTab);

    if (activeTab === "auction_room" || !viewedTeam) {
      return {
        theme: { primary: myTeam.colorPrimary, accent: myTeam.colorAccent },
        header: {
          name: "Auction Room",
          purse: myTeam.purseRemaining,
          accent: myTeam.colorAccent,
        },
        team: myTeam,
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
      team: viewedTeam,
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
              <div className="md:col-span-2 bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-yellow-400/30 shadow-xl">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Currently Bidding
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-lg"></div>
                    <img
                      src={auctionState.currentPlayer.image_path}
                      alt={auctionState.currentPlayer.name}
                      className="relative w-48 h-48 rounded-full border-4 border-yellow-400 object-cover z-10"
                    />
                  </div>
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
                <div className="my-6 p-6 bg-black/30 rounded-xl text-center border border-gray-600 backdrop-blur-sm">
                  <p className="text-6xl font-bold text-green-400 transition-colors duration-300">
                    {formatCurrency(auctionState.currentBid)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">CURRENT BID</p>
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-yellow-400/30 shadow-xl">
                <h3 className="text-2xl font-bold text-blue-400 mb-4 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Upcoming Players
                </h3>
                <div className="space-y-3">
                  {auctionState.upcomingPlayers?.map((p) => (
                    <div
                      key={p._id}
                      className="bg-gray-800/50 p-3 rounded-xl text-sm backdrop-blur-sm border border-white/10"
                    >
                      <span className="font-semibold text-white">{p.name}</span>{" "}
                      <span className="text-gray-400">({p.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 bg-black/30 rounded-2xl backdrop-blur-md border border-white/10">
              <svg
                className="w-16 h-16 mx-auto text-gray-600 mb-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xl">Waiting for auction to start...</p>
            </div>
          )}
          <div className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-yellow-400/30 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                  clipRule="evenodd"
                />
                <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
              </svg>
              Auction Pools
            </h3>
            <div className="flex flex-wrap gap-3">
              {pools.map((pool) => (
                <div
                  key={pool._id}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                    pool.isCompleted
                      ? "bg-gray-600/50 text-gray-400 border border-gray-600"
                      : pool.name === auctionState?.currentPool
                      ? "bg-yellow-500 text-black border border-yellow-300 animate-pulse"
                      : "bg-blue-600/50 text-white border border-blue-500"
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
        <div className="text-center text-gray-500 py-10 bg-black/30 rounded-2xl backdrop-blur-md border border-white/10">
          Select a team to view their squad.
        </div>
      );
    const { team, groupedPlayers } = displayedTeamData;
    const squadTabs = Object.keys(groupedPlayers);

    return (
      <div className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex border-b border-gray-700 mb-4">
          {squadTabs.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setSquadRoleTab(tabName)}
              className={`px-4 py-2 font-semibold transition-colors ${
                squadRoleTab === tabName
                  ? "text-white border-b-2"
                  : "text-gray-400 hover:text-white"
              }`}
              style={{
                borderColor:
                  squadRoleTab === tabName ? team.colorAccent : "transparent",
              }}
            >
              {tabName} ({groupedPlayers[tabName].length})
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={squadRoleTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6"
          >
            <div className="flex flex-wrap gap-4 justify-center">
              {groupedPlayers[squadRoleTab].map((p) => (
                <PlayerCard
                  key={p._id}
                  player={p}
                  accentColor={team.colorAccent}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900/50 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading your team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900/50 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-red-800/30 backdrop-blur-md p-8 rounded-2xl border border-red-500/30 text-center max-w-md">
          <svg
            className="w-16 h-16 mx-auto text-red-400 mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-3xl font-bold mb-4">An Error Occurred</h2>
          <p className="text-red-200 bg-red-800/50 p-4 rounded-xl">{error}</p>
          <p className="mt-4 text-red-300">Please try logging in again.</p>
        </div>
      </div>
    );
  }

  if (!myTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900/50 text-white flex items-center justify-center">
        Initializing...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8 text-white transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${activeViewData.theme.primary}25 0%, ${activeViewData.theme.accent}25 100%), radial-gradient(circle at 15% 50%, ${activeViewData.theme.primary}15 0%, transparent 50%), radial-gradient(circle at 85% 30%, ${activeViewData.theme.accent}15 0%, transparent 50%), #111`,
        backgroundAttachment: "fixed",
      }}
    >
      <AnimatePresence>
        {celebrationData && (
          <SoldCelebration
            player={celebrationData.player}
            team={celebrationData.team}
            onComplete={() => setCelebrationData(null)}
          />
        )}
      </AnimatePresence>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 p-6 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center gap-4">
            {activeViewData.team?.logo && (
              <img
                src={activeViewData.team.logo}
                alt={activeViewData.team.name}
                className="w-16 h-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {activeViewData.team?.shortName || activeViewData.header.name}
              </h1>
              <div className="flex items-center mt-2 text-lg text-gray-300">
                <svg
                  className="w-5 h-5 mr-2 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Purse Remaining: {formatCurrency(activeViewData.header.purse)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            {myTeam.tournament && (
              <Link
                href={`/team/analytics/${myTeam.tournament}`}
                className="px-4 py-3 rounded-xl font-semibold bg-blue-600/80 hover:bg-blue-600 transition-colors flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                View Analytics
              </Link>
            )}
            {isImpersonating ? (
              <button
                onClick={handleStopImpersonating}
                className="flex items-center gap-2 px-4 py-3 bg-yellow-500 text-black rounded-xl font-semibold transition-colors hover:bg-yellow-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
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
                    className="px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 border-2 flex items-center"
                    style={{
                      borderColor: activeViewData.header.accent,
                      color: activeViewData.header.accent,
                    }}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Squad Submission
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-3 bg-red-600/70 hover:bg-red-600 rounded-xl font-semibold transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
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

        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("auction_room")}
            className={`px-4 py-2 font-semibold flex-shrink-0 transition-all rounded-lg mx-1 ${
              activeTab === "auction_room"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M1 6a1 1 0 011-1h16a1 1 0 011 1v1H1V6zm0 4h16V9H1v1zm17 3a1 1 0 01-1 1H3a1 1 0 01-1-1v-1h16v1z" />
              </svg>
              Auction Room
            </span>
          </button>
          {allTeams.map((t) => (
            <button
              key={t._id}
              onClick={() => setActiveTab(t._id)}
              className={`px-4 py-2 font-semibold flex items-center gap-2 flex-shrink-0 transition-all rounded-lg mx-1 ${
                activeTab === t._id
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.logo && <img src={t.logo} alt={t.name} className="w-5 h-5" />}
              {t._id === myTeam?._id ? "My Squad" : t.shortName || t.name}
            </button>
          ))}
        </div>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
}
