import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";

// --- Validation Logic ---
const validateSquad = (players, min, max) => {
  if (!players || players.length < min || players.length > max)
    return `Squad must be between ${min} and ${max} players.`;
  const roles = players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  if (overseas > 6) return "Max 6 overseas players allowed in Squad.";
  if ((roles.Bowler || 0) < 3) return "At least 3 bowlers required in Squad.";
  if ((roles.Wicketkeeper || 0) < 1)
    return "At least 1 wicketkeeper required in Squad.";
  return null;
};

const validatePlayingXI = (players) => {
  if (!players || players.length !== 11)
    return "Playing XI must be exactly 11 players.";
  const roles = players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  const wk = roles.Wicketkeeper || 0;
  const bowlerAllrounders = players.filter(
    (p) => p.role === "Bowler" || p.role === "Allrounder"
  ).length;
  if (overseas > 4) return "Max 4 overseas players allowed in Playing XI.";
  if (wk < 1) return "At least 1 wicketkeeper required in Playing XI.";
  if (bowlerAllrounders < 5)
    return "At least 5 bowlers or allrounders required in Playing XI.";
  return null;
};

// --- Reusable Components ---
const RoleIcon = memo(({ role }) => {
  const icons = {
    Batter: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <path d="M14.5 2.5l-5 5L1 16l-3 3 5 5 3-3 8.5-8.5 5-5z"></path>
        <path d="M9.5 7.5l5 5"></path>
      </svg>
    ),
    Bowler: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a10 10 0 0 0-10 10c0 3.8 2.1 7.1 5.2 8.8"></path>
        <path d="M12 22a10 10 0 0 1-10-10c0-3.8 2.1-7.1 5.2-8.8"></path>
      </svg>
    ),
    Allrounder: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <path d="M14.5 2.5l-5 5L1 16l-3 3 5 5 3-3 8.5-8.5 5-5z"></path>
        <circle cx="6" cy="18" r="2"></circle>
        <path d="M9.5 7.5l5 5"></path>
      </svg>
    ),
    Wicketkeeper: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <path d="M18 13V9a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2.5"></path>
        <path d="M12.5 13.5L18 20l-4-2-4 2 5.5-6.5"></path>
        <path d="M2 13v-1a2 2 0 0 1 2-2h2"></path>
      </svg>
    ),
  };
  return <div className="w-5 h-5 text-gray-400">{icons[role] || null}</div>;
});

const Notification = memo(function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);

  const baseClasses =
    "fixed top-5 right-5 p-4 rounded-xl shadow-xl text-white text-sm z-[100] border backdrop-blur-md";
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
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const PlayerSlot = memo(function PlayerSlot({
  player,
  onSelect,
  onClear,
  onSetCaptain,
  onSetViceCaptain,
  isCaptain,
  isVC,
}) {
  const hasPlayer = !!player;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center group">
      {hasPlayer ? (
        <motion.div
          layoutId={`player-slot-${player._id}`}
          className="relative w-20 h-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 20 },
          }}
          exit={{ opacity: 0, scale: 0.5 }}
        >
          <img
            src={player.image_path}
            alt={player.name}
            className="w-full h-full object-cover rounded-full border-2 border-gray-500/50"
            style={{ filter: "drop-shadow(0 10px 8px rgba(0,0,0,0.5))" }}
          />
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-max flex justify-center">
            <RoleIcon role={player.role} />
          </div>

          <motion.button
            onClick={onSetCaptain}
            title="Set Captain"
            className="absolute -top-3 -left-3 text-xs bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-full w-7 h-7 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            C
          </motion.button>
          <motion.button
            onClick={onSetViceCaptain}
            title="Set Vice-Captain"
            className="absolute -bottom-3 -left-3 text-xs bg-gray-400 hover:bg-gray-300 text-black font-bold rounded-full w-7 h-7 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            VC
          </motion.button>
          <motion.button
            onClick={onClear}
            title="Remove Player"
            className="absolute -top-3 -right-3 text-xs bg-red-500 hover:bg-red-400 text-white font-bold rounded-full w-7 h-7 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            ✕
          </motion.button>

          {(isCaptain || isVC) && (
            <div
              className={`absolute top-0 right-0 text-xs text-black font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 ${
                isCaptain ? "bg-yellow-400" : "bg-gray-400"
              }`}
            >
              {isCaptain ? "C" : "VC"}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSelect}
          className="w-20 h-20 rounded-full bg-black/20 border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-400 hover:bg-green-500/20 hover:border-green-500 transition-colors"
        >
          <span className="text-3xl font-thin">+</span>
        </motion.button>
      )}
    </div>
  );
});

const PlayerSelectionModal = memo(function PlayerSelectionModal({
  isOpen,
  onClose,
  players,
  onSelect,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-400">Select a Player</h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-2xl hover:text-white"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {players.map((player) => (
              <motion.div
                key={player._id}
                onClick={() => onSelect(player)}
                className="bg-gray-800 p-3 rounded-lg text-center cursor-pointer hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-500"
                whileHover={{ y: -5 }}
              >
                <img
                  src={player.image_path}
                  alt={player.name}
                  className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-gray-700"
                />
                <p className="font-semibold mt-2 text-sm truncate">
                  {player.name}
                </p>
                <p className="text-xs text-gray-400">{player.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

const SquadList = memo(function SquadList({
  players,
  onAdd,
  onRemove,
  captain,
  viceCaptain,
  maxPlayers,
  accentColor,
}) {
  return (
    <div className="bg-black/30 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4" style={{ color: accentColor }}>
        Squad ({players.length}/{maxPlayers})
      </h2>
      <ul className="space-y-2 flex-grow overflow-y-auto pr-2">
        {players.map((player) => (
          <li
            key={player._id}
            className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg group"
          >
            <div className="flex items-center gap-3">
              {player.image_path && (
                <img
                  src={player.image_path}
                  alt={player.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <span className="font-semibold">{player.name}</span>
                <p className="text-xs text-gray-400">{player.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {captain?._id === player._id && (
                <span className="text-xs bg-yellow-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  C
                </span>
              )}
              {viceCaptain?._id === player._id && (
                <span className="text-xs bg-gray-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  VC
                </span>
              )}
              <button
                onClick={() => onRemove(player)}
                className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
            </div>
          </li>
        ))}
        {players.length < maxPlayers && (
          <li>
            <button
              onClick={onAdd}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-800/50 hover:bg-green-500/20 border-2 border-dashed border-gray-700 hover:border-green-500 transition-all"
            >
              <span className="text-gray-400 text-sm font-semibold">
                + Add Substitute
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
});

// --- Main TeamSubmissionPage Component ---
export default function TeamSubmissionPage() {
  const router = useRouter();
  const [myTeam, setMyTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [playingXI, setPlayingXI] = useState(Array(11).fill(null));
  const [substitutes, setSubstitutes] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/team/login");
      return;
    }

    const fetchData = async () => {
      try {
        const teamData = await api.auth.me();
        if (!teamData || !teamData.tournament) {
          router.push("/team/login");
          return;
        }
        setMyTeam(teamData);

        const tourney = await api.tournaments.getById(teamData.tournament);
        setTournament(tourney);

        if (teamData.submission) {
          const xiPlayers = Array(11).fill(null);
          const xiIds = new Set(
            teamData.submission.playingXI.map((p) => p._id)
          );
          if (teamData.submission.playingXI.length <= 11) {
            teamData.submission.playingXI.forEach((p, i) => {
              xiPlayers[i] = p;
            });
          }
          setPlayingXI(xiPlayers);

          const subPlayers = teamData.submission.squad.filter(
            (p) => !xiIds.has(p._id)
          );
          setSubstitutes(subPlayers);

          setCaptain(teamData.submission.captain || null);
          setViceCaptain(teamData.submission.viceCaptain || null);
        }
      } catch (e) {
        console.error(e);
        router.push("/team/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const availablePlayers = useMemo(() => {
    if (!myTeam) return [];
    const selectedIds = new Set([
      ...playingXI.filter(Boolean).map((p) => p._id),
      ...substitutes.map((p) => p._id),
    ]);
    return myTeam.players.filter((p) => !selectedIds.has(p._id));
  }, [myTeam, playingXI, substitutes]);

  const squad = useMemo(
    () => [...playingXI.filter(Boolean), ...substitutes],
    [playingXI, substitutes]
  );

  const handleSelectSlot = (index) => {
    setActiveSlot(index);
    setIsModalOpen(true);
  };

  const handleAddSubstitute = () => {
    if (!tournament || squad.length >= tournament.maxSquadSize) {
      setNotification({
        message: "Maximum squad size reached!",
        type: "error",
      });
      return;
    }
    setActiveSlot("sub");
    setIsModalOpen(true);
  };

  const handlePlayerSelection = (player) => {
    if (activeSlot === "sub") {
      if (tournament && squad.length < tournament.maxSquadSize) {
        setSubstitutes((prev) => [...prev, player]);
      } else {
        setNotification({ message: "Squad is full!", type: "error" });
      }
    } else if (typeof activeSlot === "number") {
      const newXI = [...playingXI];
      newXI[activeSlot] = player;
      setPlayingXI(newXI);
    }
    setIsModalOpen(false);
    setActiveSlot(null);
  };

  const handleClearPlayer = (index) => {
    const playerToRemove = playingXI[index];
    if (playerToRemove?._id === captain?._id) setCaptain(null);
    if (playerToRemove?._id === viceCaptain?._id) setViceCaptain(null);

    const newXI = [...playingXI];
    newXI[index] = null;
    setPlayingXI(newXI);
  };

  const handleRemoveFromSquad = (player) => {
    if (player._id === captain?._id) setCaptain(null);
    if (player._id === viceCaptain?._id) setViceCaptain(null);

    const xiIndex = playingXI.findIndex((p) => p?._id === player._id);
    if (xiIndex > -1) {
      const newXI = [...playingXI];
      newXI[xiIndex] = null;
      setPlayingXI(newXI);
    } else {
      setSubstitutes((prev) => prev.filter((p) => p._id !== player._id));
    }
  };

  const handleSetCaptain = (player) => {
    if (!playingXI.find((p) => p?._id === player?._id)) {
      return setNotification({
        message: "Captain must be in the Playing XI",
        type: "error",
      });
    }
    if (viceCaptain?._id === player._id) setViceCaptain(null);
    setCaptain(player);
  };

  const handleSetViceCaptain = (player) => {
    if (!playingXI.find((p) => p?._id === player?._id)) {
      return setNotification({
        message: "Vice-Captain must be in the Playing XI",
        type: "error",
      });
    }
    if (captain?._id === player._id) setCaptain(null);
    setViceCaptain(player);
  };

  const handleSubmit = useCallback(async () => {
    const finalPlayingXI = playingXI.filter(Boolean);
    const finalSquad = [...finalPlayingXI, ...substitutes];

    const squadError = validateSquad(
      finalSquad,
      tournament.minSquadSize,
      tournament.maxSquadSize
    );
    if (squadError) {
      return setNotification({
        message: `Squad Invalid: ${squadError}`,
        type: "error",
      });
    }
    const xiError = validatePlayingXI(finalPlayingXI);
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
        squadIds: finalSquad.map((p) => p._id),
        playingXIIds: finalPlayingXI.map((p) => p._id),
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
  }, [playingXI, substitutes, captain, viceCaptain, tournament]);

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

  const formation = [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9], [10]];
  const formationLabels = ["Top Order", "Middle Order", "Lower Order", "Tail"];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>

      <PlayerSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        players={availablePlayers}
        onSelect={handlePlayerSelection}
      />

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 p-6 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-4">
            {myTeam.logo && (
              <img
                src={myTeam.logo}
                alt={myTeam.name}
                className="w-12 h-12 object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Squad Submission
              </h1>
              <p className="text-gray-300 mt-1">{myTeam.name}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center mt-6 lg:mt-0">
            <button
              onClick={handleSubmit}
              disabled={myTeam?.submission?.locked}
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
              {myTeam?.submission?.locked
                ? "Submission Locked"
                : "Submit Squad"}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 p-4 rounded-[50px] border border-green-400/20 shadow-lg relative overflow-hidden flex flex-col items-center"
            style={{
              background: `
                        radial-gradient(ellipse at center, rgba(12, 100, 59, 0.4) 0%, rgba(8, 60, 37, 0.6) 100%),
                        repeating-linear-gradient(90deg, #16a34a20, #16a34a20 30px, #15803d20 30px, #15803d20 60px)
                    `,
              height: "80vh",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {myTeam.logo && (
                <img
                  src={myTeam.logo}
                  alt={myTeam.name}
                  className="w-1/2 opacity-5 grayscale"
                />
              )}
            </div>

            <div className="w-full h-full flex flex-col justify-evenly">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-bold tracking-widest uppercase text-white/50">
                Playing XI
              </div>
              {formation.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="z-10 w-full flex items-center gap-4 px-4"
                >
                  <h3 className="w-24 text-right font-bold text-white/40 text-sm uppercase tracking-wider">
                    {formationLabels[rowIndex]}
                  </h3>
                  <div className="flex-1 flex justify-center gap-x-2 lg:gap-x-8">
                    {row.map((index) => (
                      <PlayerSlot
                        key={index}
                        player={playingXI[index]}
                        onSelect={() => handleSelectSlot(index)}
                        onClear={() => handleClearPlayer(index)}
                        onSetCaptain={() => handleSetCaptain(playingXI[index])}
                        onSetViceCaptain={() =>
                          handleSetViceCaptain(playingXI[index])
                        }
                        isCaptain={captain?._id === playingXI[index]?._id}
                        isVC={viceCaptain?._id === playingXI[index]?._id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SquadList
            players={squad}
            onAdd={handleAddSubstitute}
            onRemove={handleRemoveFromSquad}
            captain={captain}
            viceCaptain={viceCaptain}
            maxPlayers={tournament.maxSquadSize}
            accentColor={myTeam.colorAccent}
          />
        </div>
      </div>
    </div>
  );
}
