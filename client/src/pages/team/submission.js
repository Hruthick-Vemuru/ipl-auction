import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// --- Validation Logic (Unchanged) ---
const countRoles = (players) => {
  return players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
};

const validateSquad = (players, min, max) => {
  const roles = countRoles(players);
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  if (players.length < min || players.length > max)
    return `Squad must be between ${min} and ${max} players`;
  if (overseas > 6) return "Max 6 overseas players allowed in Squad";
  if ((roles.Bowler || 0) < 3) return "At least 3 bowlers required in Squad";
  if ((roles.Wicketkeeper || 0) < 1)
    return "At least 1 wicketkeeper required in Squad";
  return null;
};

const validatePlayingXI = (players) => {
  const roles = countRoles(players);
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  const wk = roles.Wicketkeeper || 0;
  const bowlerAllrounders = players.filter(
    (p) => p.role === "Bowler" || p.role === "Allrounder"
  ).length;
  if (players.length !== 11) return "Playing XI must be exactly 11 players";
  if (overseas > 4) return "Max 4 overseas players allowed in Playing XI";
  if (wk < 1) return "At least 1 wicketkeeper required in Playing XI";
  if (bowlerAllrounders < 5)
    return "At least 5 bowlers or allrounders required in Playing XI";
  return null;
};

// --- Reusable Components ---
const Notification = memo(function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);

  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-xl shadow-xl text-white text-sm z-50 border backdrop-blur-md";
  const typeClasses =
    type === "success"
      ? "bg-emerald-500/20 border-emerald-500"
      : "bg-rose-500/20 border-rose-500";
  return (
    <AnimatePresence>
      {message && (
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
      )}
    </AnimatePresence>
  );
});

// Enhanced PlayerCard Component with 3D effect
const PlayerCard = memo(function PlayerCard({
  player,
  accentColor,
  onAction,
  actionIcon,
  isCaptain,
  isVC,
  onSetCaptain,
  onSetViceCaptain,
}) {
  const roleColors = {
    Batsman: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    Bowler: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Allrounder: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Wicketkeeper: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative w-full bg-gradient-to-b from-gray-900/80 to-gray-950/80 backdrop-blur-md rounded-2xl pt-16 pb-4 px-4 text-center shadow-xl border border-white/5 group hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
    >
      {/* Player Image with 3D effect */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-28 h-28">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-lg z-0"></div>
        <div className="relative w-full h-full z-10">
          <img
            src={player.image_path}
            alt={player.name}
            className="w-full h-full object-cover rounded-full border-4 border-gray-800 shadow-xl"
            style={{ borderColor: accentColor }}
          />
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Role badge */}
        <div
          className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full border ${
            roleColors[player.role] || "bg-gray-700"
          }`}
        >
          {player.role}
        </div>

        {/* Action button */}
        {onAction && (
          <button
            onClick={onAction}
            className="absolute -top-2 -right-2 text-white bg-gray-800 hover:bg-green-500 rounded-full w-7 h-7 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-md z-20"
            style={{ backgroundColor: accentColor }}
          >
            {actionIcon}
          </button>
        )}
      </div>

      {/* Player Info */}
      <div
        className="font-bold text-lg mt-8 mb-1 leading-tight truncate"
        style={{ color: accentColor }}
      >
        {player.name}
      </div>

      <div className="flex items-center justify-center mb-2">
        <svg
          className="w-4 h-4 text-yellow-400 mr-1"
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
        <p className="text-sm text-gray-200 font-medium">
          {formatCurrency(player.soldPrice)}
        </p>
      </div>

      <div className="text-xs text-gray-400 uppercase tracking-wide flex items-center justify-center">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
        {player.nationality}
      </div>

      {/* Captain/VC Indicators */}
      {(isCaptain || isVC) && (
        <div className="absolute top-14 left-2 flex flex-col gap-1">
          {isCaptain && (
            <div
              className="text-xs bg-yellow-500 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md border border-yellow-300"
              title="Captain"
            >
              C
            </div>
          )}
          {isVC && (
            <div
              className="text-xs bg-gray-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md border border-gray-300"
              title="Vice-Captain"
            >
              VC
            </div>
          )}
        </div>
      )}

      {/* Set Captain/VC Buttons */}
      {onSetCaptain && (
        <div className="absolute top-14 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onSetCaptain}
            title="Set as Captain"
            className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors border border-yellow-300"
          >
            C
          </button>
          <button
            onClick={onSetViceCaptain}
            title="Set as Vice-Captain"
            className="text-xs bg-gray-400 hover:bg-gray-300 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md transition-colors border border-gray-300"
          >
            VC
          </button>
        </div>
      )}
    </motion.div>
  );
});

const SectionHeader = ({ title, count, max, accentColor, children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 p-4 bg-black/30 rounded-xl border border-white/5">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: accentColor }}>
          {title} {count !== undefined && `(${count}/${max})`}
        </h2>
        {children}
      </div>
      <div className="mt-2 sm:mt-0">
        <div className="w-full bg-gray-800 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${(count / max) * 100}%`,
              backgroundColor: accentColor,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const PlayerSection = ({ children, className = "" }) => {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto p-2 ${className}`}
    >
      {children}
    </div>
  );
};

// --- Main TeamSubmissionPage Component ---
export default function TeamSubmissionPage() {
  const router = useRouter();
  const [myTeam, setMyTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [squad, setSquad] = useState([]);
  const [playingXI, setPlayingXI] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("squad");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/team/login");
    } else {
      api.auth
        .me()
        .then(async (teamData) => {
          setMyTeam(teamData);
          if (teamData.submission) {
            setSubmission(teamData.submission);
            setSquad(teamData.submission.squad || []);
            setPlayingXI(teamData.submission.playingXI || []);
            setCaptain(teamData.submission.captain || null);
            setViceCaptain(teamData.submission.viceCaptain || null);
          }
          const tourney = await api.tournaments.getById(teamData.tournament);
          setTournament(tourney);
        })
        .catch(() => router.push("/team/login"))
        .finally(() => setIsLoading(false));
    }
  }, [router]);

  const availablePlayers = useMemo(() => {
    if (!myTeam) return [];
    const selectedIds = new Set(squad.map((p) => p._id));
    return myTeam.players.filter(
      (p) =>
        !selectedIds.has(p._id) &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [myTeam, squad, searchTerm]);

  const squadWithoutXI = useMemo(() => {
    if (!squad) return [];
    const xiIds = new Set(playingXI.map((p) => p._id));
    return squad.filter((p) => !xiIds.has(p._id));
  }, [squad, playingXI]);

  const moveToSquad = useCallback(
    (player) => {
      if (squad.length < (tournament?.maxSquadSize || 18)) {
        setSquad((prev) => [...prev, player]);
      } else {
        setNotification({
          message: `Squad is full (${
            tournament?.maxSquadSize || 18
          } players max).`,
          type: "error",
        });
      }
    },
    [squad, tournament]
  );

  const moveFromSquad = useCallback(
    (player) => {
      setSquad((prev) => prev.filter((p) => p._id !== player._id));
      setPlayingXI((prev) => prev.filter((p) => p._id !== player._id));
      if (captain?._id === player._id) setCaptain(null);
      if (viceCaptain?._id === player._id) setViceCaptain(null);
    },
    [captain, viceCaptain]
  );

  const moveToXI = useCallback(
    (player) => {
      if (playingXI.length < 11) {
        setPlayingXI((prev) => [...prev, player]);
      } else {
        setNotification({
          message: "Playing XI is full (11 players max).",
          type: "error",
        });
      }
    },
    [playingXI]
  );

  const moveFromXI = useCallback(
    (player) => {
      setPlayingXI((prev) => prev.filter((p) => p._id !== player._id));
      if (captain?._id === player._id) setCaptain(null);
      if (viceCaptain?._id === player._id) setViceCaptain(null);
    },
    [captain, viceCaptain]
  );

  const setPlayerAsCaptain = useCallback(
    (player) => {
      if (viceCaptain?._id === player._id) setViceCaptain(null);
      setCaptain(player);
    },
    [viceCaptain]
  );

  const setPlayerAsViceCaptain = useCallback(
    (player) => {
      if (captain?._id === player._id) setCaptain(null);
      setViceCaptain(player);
    },
    [captain]
  );

  const handleSubmit = useCallback(async () => {
    const squadError = validateSquad(
      squad,
      tournament.minSquadSize,
      tournament.maxSquadSize
    );
    if (squadError) {
      return setNotification({
        message: `Squad Invalid: ${squadError}`,
        type: "error",
      });
    }
    const xiError = validatePlayingXI(playingXI);
    if (xiError) {
      return setNotification({
        message: `Playing XI Invalid: ${xiError}`,
        type: "error",
      });
    }
    if (!captain) {
      return setNotification({
        message: "You must select a Captain for your Playing XI.",
        type: "error",
      });
    }
    if (!viceCaptain) {
      return setNotification({
        message: "You must select a Vice-Captain for your Playing XI.",
        type: "error",
      });
    }

    try {
      const payload = {
        squadIds: squad.map((p) => p._id),
        playingXIIds: playingXI.map((p) => p._id),
        captainId: captain?._id,
        viceCaptainId: viceCaptain?._id,
      };
      await api.submissions.submit(payload);
      setNotification({
        message: "Squad submitted successfully!",
        type: "success",
      });
    } catch (e) {
      setNotification({ message: `Error: ${e.message}`, type: "error" });
    }
  }, [squad, playingXI, captain, viceCaptain, tournament]);

  if (isLoading || !myTeam || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900/50 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading your team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900/50 text-white p-4 md:p-6">
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 p-6 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Squad Submission
            </h1>
            <p className="text-gray-300 mt-2">{myTeam.name}</p>
            <div className="flex items-center mt-4 text-sm text-gray-400">
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Tournament: {tournament.title}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center mt-6 lg:mt-0">
            {submission?.locked && submission?.grade && (
              <div className="text-center px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <span className="text-sm text-yellow-300">Final Grade</span>
                <div className="text-xl font-bold text-yellow-300">
                  {submission.grade}
                </div>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submission?.locked}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {submission?.locked ? "Submission Locked" : "Submit Squad"}
            </button>
            <Link
              href="/team"
              className="px-4 py-3 rounded-xl font-semibold border-2 transition-all flex items-center"
              style={{
                borderColor: myTeam.colorAccent,
                color: myTeam.colorAccent,
              }}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Available Players Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-1 bg-black/30 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg"
          >
            <h2 className="text-xl font-semibold mb-4 text-blue-400">
              Available Players
            </h2>

            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="text-xs text-gray-400 mb-4">
              {availablePlayers.length} players available
            </div>

            <div className="h-[calc(100vh-25rem)] overflow-y-auto pr-2 pt-12">
              <div className="grid grid-cols-2 gap-4">
                <AnimatePresence>
                  {availablePlayers.map((p) => (
                    <PlayerCard
                      key={p._id}
                      player={p}
                      accentColor={myTeam.colorAccent}
                      onAction={() => moveToSquad(p)}
                      actionIcon="+"
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Squad Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-black/30 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg"
            >
              <SectionHeader
                title="Final Squad"
                count={squad.length}
                max={tournament.maxSquadSize}
                accentColor={myTeam.colorAccent}
              >
                <p className="text-sm text-gray-400 mt-1">
                  Min players: {tournament.minSquadSize} | Click '+' to add to
                  Playing XI
                </p>
              </SectionHeader>

              <div className="h-80 overflow-y-auto pr-2 pt-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {squadWithoutXI.map((p) => (
                      <PlayerCard
                        key={p._id}
                        player={p}
                        accentColor={myTeam.colorAccent}
                        onAction={() => moveToXI(p)}
                        actionIcon="→"
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Playing XI Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-black/30 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg"
            >
              <SectionHeader
                title="Playing XI"
                count={playingXI.length}
                max={11}
                accentColor={myTeam.colorAccent}
              >
                <p className="text-sm text-gray-400 mt-1">
                  Hover to set C/VC | Click '←' to remove
                </p>
              </SectionHeader>

              <div className="h-80 overflow-y-auto pr-2 pt-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {playingXI.map((p) => (
                      <PlayerCard
                        key={p._id}
                        player={p}
                        accentColor={myTeam.colorAccent}
                        onAction={() => moveFromXI(p)}
                        actionIcon="←"
                        isCaptain={captain?._id === p._id}
                        isVC={viceCaptain?._id === p._id}
                        onSetCaptain={() => setPlayerAsCaptain(p)}
                        onSetViceCaptain={() => setPlayerAsViceCaptain(p)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
