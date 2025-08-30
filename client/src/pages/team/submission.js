import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";
// --- THIS IS THE ONLY CORRECT IMPORT ---
import { formatCurrency, getTextColorForBackground } from "../../lib/utils";

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

// --- Reusable PlayerCard component ---
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
  return (
    <div className="bg-gray-700 rounded-lg p-3 text-center shadow-lg relative group">
      <div className="font-bold text-lg" style={{ color: accentColor }}>
        {player.name}
      </div>
      <div className="text-gray-300 text-sm">{player.role}</div>
      {player.soldPrice > 0 && (
        <div className="text-green-400 font-semibold text-sm mt-1">
          {formatCurrency(player.soldPrice)}
        </div>
      )}
      <div
        className={`text-xs font-semibold px-2 py-1 mt-2 rounded-full inline-block ${
          player.nationality === "Overseas" ? "bg-blue-500" : "bg-green-500"
        }`}
      >
        {player.nationality}
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="absolute top-2 right-2 text-white bg-gray-600 hover:bg-green-600 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
        >
          {actionIcon}
        </button>
      )}

      {isCaptain && (
        <div
          className="absolute top-2 left-2 text-xs bg-yellow-500 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          title="Captain"
        >
          C
        </div>
      )}
      {isVC && (
        <div
          className="absolute top-2 left-2 text-xs bg-gray-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          title="Vice-Captain"
        >
          VC
        </div>
      )}

      {onSetCaptain && (
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onSetCaptain}
            className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          >
            C
          </button>
          <button
            onClick={onSetViceCaptain}
            className="text-xs bg-gray-400 hover:bg-gray-300 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          >
            VC
          </button>
        </div>
      )}
    </div>
  );
});

// --- Main TeamSubmissionPage Component ---
export default function TeamSubmissionPage() {
  const router = useRouter();
  const [myTeam, setMyTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [squad, setSquad] = useState([]);
  const [playingXI, setPlayingXI] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [viceCaptain, setViceCaptain] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/team/login");
    } else {
      api.teams
        .me()
        .then(setMyTeam)
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
      if (squad.length < 15) {
        setSquad((prev) => [...prev, player]);
      } else {
        setNotification({
          message: "Squad is full (15 players max).",
          type: "error",
        });
      }
    },
    [squad]
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
  }, [squad, playingXI, captain, viceCaptain]);

  if (isLoading || !myTeam) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: myTeam.colorPrimary }}
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
              className="text-4xl font-bold"
              style={{ color: myTeam.colorAccent }}
            >
              Squad Submission
            </h1>
            <p className="text-white text-opacity-80">{myTeam.name}</p>
          </div>
          <div className="flex gap-4 items-center mt-4 md:mt-0">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 transition-colors"
              style={{ color: getTextColorForBackground(myTeam.colorAccent) }}
            >
              Submit Squad
            </button>
            <Link
              href="/team"
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                background: myTeam.colorAccent,
                color: getTextColorForBackground(myTeam.colorAccent),
              }}
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2
                className="text-2xl font-semibold mb-4"
                style={{ color: myTeam.colorAccent }}
              >
                Available Players ({availablePlayers.length})
              </h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-64 overflow-y-auto pr-2">
                {availablePlayers.map((p) => (
                  <PlayerCard
                    key={p._id}
                    player={p}
                    accentColor={myTeam.colorAccent}
                    onAction={() => moveToSquad(p)}
                    actionIcon="+"
                  />
                ))}
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2
                className="text-2xl font-semibold mb-4"
                style={{ color: myTeam.colorAccent }}
              >
                Final Squad ({squad.length}/15)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Click player to move to Playing XI. Hold hover for actions.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-64 overflow-y-auto pr-2">
                {squadWithoutXI.map((p) => (
                  <PlayerCard
                    key={p._id}
                    player={p}
                    accentColor={myTeam.colorAccent}
                    onAction={() => moveToXI(p)}
                    actionIcon=">"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: myTeam.colorAccent }}
            >
              Playing XI ({playingXI.length}/11)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Click player to move back to Squad. Hold hover for C/VC.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-[36rem] overflow-y-auto pr-2">
              {playingXI.map((p) => (
                <PlayerCard
                  key={p._id}
                  player={p}
                  accentColor={myTeam.colorAccent}
                  onAction={() => moveFromXI(p)}
                  actionIcon="<"
                  isCaptain={captain?._id === p._id}
                  isVC={viceCaptain?._id === p._id}
                  onSetCaptain={() => setPlayerAsCaptain(p)}
                  onSetViceCaptain={() => setPlayerAsViceCaptain(p)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
