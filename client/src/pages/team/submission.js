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
    "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 border";
  const typeClasses =
    type === "success"
      ? "bg-green-500/20 border-green-500"
      : "bg-red-500/20 border-red-500";
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className={`${baseClasses} ${typeClasses}`}
        >
          {message}
          <button
            onClick={onClose}
            className="ml-4 font-bold opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative w-full bg-black/30 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg group border border-white/10"
    >
      <div className="relative w-24 h-24 mx-auto -mt-12">
        <img
          src={player.image_path}
          alt={player.name}
          className="w-full h-full object-cover rounded-full"
        />
        {onAction && (
          <button
            onClick={onAction}
            className="absolute -top-1 -right-1 text-white bg-gray-700 hover:bg-green-500 rounded-full w-8 h-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
          >
            {actionIcon}
          </button>
        )}
      </div>
      <div
        className="font-bold text-lg mt-3 leading-tight truncate"
        style={{ color: accentColor }}
      >
        {player.name}
      </div>
      <p className="text-sm text-gray-400">
        {formatCurrency(player.soldPrice)}
      </p>

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
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onSetCaptain}
            title="Set as Captain"
            className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          >
            C
          </button>
          <button
            onClick={onSetViceCaptain}
            title="Set as Vice-Captain"
            className="text-xs bg-gray-400 hover:bg-gray-300 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center"
          >
            VC
          </button>
        </div>
      )}
    </motion.div>
  );
});

const ThreeJSCanvas = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;
    let scene,
      camera,
      renderer,
      particles,
      mouseX = 0,
      mouseY = 0;

    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        75,
        currentMount.clientWidth / currentMount.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      currentMount.appendChild(renderer.domElement);

      const particleCount = 5000;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 15;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      const particleMaterial = new THREE.PointsMaterial({
        color: 0x4488ff,
        size: 0.015,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.0001;
      camera.position.x += (mouseX - camera.position.x) * 0.02;
      camera.position.y += (-mouseY - camera.position.y) * 0.02;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    const onMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("mousemove", onMouseMove);
    init();

    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("mousemove", onMouseMove);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);
  return (
    <div
      ref={mountRef}
      className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-gray-900 via-black to-blue-900/50"
    />
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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 text-white">
      <ThreeJSCanvas />
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
      <div className="max-w-screen-2xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
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
            {submission?.locked && submission?.grade && (
              <div className="text-center">
                <span className="text-sm text-gray-300">Final Grade</span>
                <div className="px-4 py-1 bg-yellow-500 text-black font-bold rounded-md text-lg">
                  {submission.grade}
                </div>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submission?.locked}
              className="px-6 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {submission?.locked ? "Locked" : "Submit Squad"}
            </button>
            <Link
              href="/team"
              className="px-4 py-2 rounded-lg font-semibold border-2"
              style={{
                borderColor: myTeam.colorAccent,
                color: myTeam.colorAccent,
              }}
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1 bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-white/10"
          >
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-14 h-[calc(100vh-25rem)] overflow-y-auto pr-2 pt-12">
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
          </motion.div>
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-white/10"
            >
              <h2
                className="text-2xl font-semibold mb-4"
                style={{ color: myTeam.colorAccent }}
              >
                Final Squad ({squad.length}/{tournament.maxSquadSize})
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Click `&gt;` to add to Playing XI. Min players:{" "}
                {tournament.minSquadSize}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14 min-h-[22rem] overflow-y-auto pr-2 pt-12">
                <AnimatePresence>
                  {squadWithoutXI.map((p) => (
                    <PlayerCard
                      key={p._id}
                      player={p}
                      accentColor={myTeam.colorAccent}
                      onAction={() => moveToXI(p)}
                      actionIcon=">"
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-white/10"
            >
              <h2
                className="text-2xl font-semibold mb-4"
                style={{ color: myTeam.colorAccent }}
              >
                Playing XI ({playingXI.length}/11)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Click `&lt;` to remove. Hover to set C/VC.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14 min-h-[22rem] overflow-y-auto pr-2 pt-12">
                <AnimatePresence>
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
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
