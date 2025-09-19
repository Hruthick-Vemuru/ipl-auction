import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../../lib/api";
import { io } from "socket.io-client";
import { formatCurrency } from "../../../lib/utils";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import anime from "animejs";

// --- Reusable Notification Component ---
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

// --- REVAMPED Three.js Background Component ---
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
      mouseY = 0,
      shapes = [];

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

      // Particles
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

      // Glowing Shapes
      const shapeGeometry = new THREE.TetrahedronGeometry(0.2, 0);
      for (let i = 0; i < 15; i++) {
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(Math.random(), Math.random(), Math.random()),
          emissive: new THREE.Color(0x111111),
          metalness: 0.9,
          roughness: 0.1,
        });
        const shape = new THREE.Mesh(shapeGeometry, material);
        shape.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
        shape.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        shapes.push(shape);
        scene.add(shape);
      }

      const light = new THREE.PointLight(0xffffff, 100, 100);
      light.position.set(0, 0, 5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.2));

      animate();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.0001;
      particles.rotation.y = time;
      shapes.forEach((shape) => {
        shape.rotation.x += 0.001;
        shape.rotation.y += 0.002;
      });
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

// --- Currency Input Component for Dynamic Bidding ---
const CurrencyInput = memo(function CurrencyInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
}) {
  return (
    <div className="flex items-center relative bg-white/5 border border-white/20 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
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
        className="bg-white/10 h-full rounded-r-md px-2 text-sm appearance-none focus:outline-none"
      >
        <option>Lakhs</option>
        <option>Crores</option>
      </select>
    </div>
  );
});

// --- StatDisplay Component ---
const StatDisplay = ({ title, stats }) => {
  if (!stats || (!stats.batting && !stats.bowling)) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-black/30 p-3 rounded-lg border border-white/10"
    >
      <h4 className="font-bold text-blue-400 text-md mb-2">{title} Career</h4>
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
              <div className="text-xs text-gray-500">Avg</div>
              <div className="font-bold">{stats.bowling.average}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">SR</div>
              <div className="font-bold">{stats.bowling.strike_rate}</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
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
    <motion.div
      className={`fixed top-0 right-0 h-full bg-black/50 backdrop-blur-lg border-l border-white/10 z-40 w-80`}
      animate={{ x: isOpen ? 0 : "100%" }}
      transition={{ ease: "easeInOut", duration: 0.3 }}
    >
      <button
        onClick={onToggle}
        className="absolute top-4 -left-12 bg-black/50 backdrop-blur-sm border border-white/10 p-2 rounded-l-lg transition-colors hover:bg-blue-500/50"
      >
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          )}
        </motion.div>
      </button>

      <div className="p-4 h-full flex flex-col">
        <div className="flex border-b border-white/10 mb-4">
          <button
            onClick={() => setActiveTab("pools")}
            className={`flex-1 py-2 font-semibold ${
              activeTab === "pools"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
            }`}
          >
            Pools
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 font-semibold ${
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
              {pools.map((pool, index) => {
                const hasAvailablePlayers = pool.players.some(
                  (p) => p.status === "Available"
                );
                return (
                  <motion.button
                    key={pool._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onStartPool(pool._id)}
                    disabled={pool.isCompleted || !hasAvailablePlayers}
                    className="w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {pool.name} {pool.isCompleted ? "(Completed)" : ""}
                  </motion.button>
                );
              })}
            </div>
          )}
          {activeTab === "upcoming" && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-300 px-2">
                Next Players
              </h3>
              {upcomingPlayers?.map((p, index) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 p-2 rounded text-sm"
                >
                  <span className="font-semibold">{p.name}</span>{" "}
                  <span className="text-gray-400">({p.role})</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Custom Team Select Dropdown ---
const CustomTeamSelect = ({ teams, selectedTeamId, onSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedTeam = teams.find((t) => t._id === selectedTeamId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
      >
        <span>
          {selectedTeam ? selectedTeam.name : "-- Select Winning Team --"}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-black/80 backdrop-blur-lg border border-white/10 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {teams.map((team) => (
              <li
                key={team._id}
                onClick={() => {
                  onSelect(team._id);
                  setIsOpen(false);
                }}
                className="p-3 hover:bg-blue-500/30 cursor-pointer"
              >
                {team.name}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LiveAuctionPage() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournament, setTournament] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [pools, setPools] = useState([]);
  const [notification, setNotification] = useState(null);
  const [soldToTeamId, setSoldToTeamId] = useState("");
  const [customIncrement, setCustomIncrement] = useState({
    value: 50,
    unit: "Lakhs",
  });
  const socketRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
    socketRef.current.on("auction_notification", (data) =>
      setNotification(data)
    );

    return () => socketRef.current.disconnect();
  }, [tournamentId, router]);

  const handleBidUpdate = useCallback(
    (increment) => {
      if (!tournamentId || !auctionState?.currentPlayer) return;
      const newBid = Math.max(
        auctionState.currentPlayer.basePrice,
        auctionState.currentBid + increment
      );
      socketRef.current.emit("admin_update_bid", { tournamentId, newBid });
    },
    [tournamentId, auctionState]
  );

  const handleCustomBidUpdate = useCallback(() => {
    const incrementValue =
      (parseFloat(customIncrement.value) || 0) *
      (customIncrement.unit === "Lakhs" ? 100000 : 10000000);
    if (incrementValue > 0) {
      handleBidUpdate(incrementValue);
    }
  }, [customIncrement, handleBidUpdate]);

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

  const quickIncrements = [100000, 500000, 1000000];

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading Auction...
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col overflow-hidden">
      <ThreeJSCanvas />
      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />

      <div className="flex-grow flex">
        <main
          className={`flex-grow p-4 md:p-8 transition-all duration-300 relative ${
            isSidebarOpen ? "mr-80" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  {tournament?.title}
                </h1>
                <p className="text-gray-400">Live Auction Control Room</p>
              </div>
              <Link
                href={`/admin/auction/${tournamentId}`}
                className="text-blue-400 hover:underline"
              >
                &larr; Back to Setup
              </Link>
            </header>

            <AnimatePresence mode="wait">
              {auctionState?.currentPlayer ? (
                <motion.div
                  key={auctionState.currentPlayer._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <motion.img
                          src={auctionState.currentPlayer.image_path}
                          alt={auctionState.currentPlayer.name}
                          className="w-48 h-48 rounded-full border-4 border-yellow-400 object-cover flex-shrink-0"
                          layoutId={`player-image-${auctionState.currentPlayer._id}`}
                        />
                        <div className="flex-grow w-full">
                          <h3 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                            {auctionState.currentPlayer.name}
                          </h3>
                          <p className="text-xl text-gray-300 mt-1">
                            {auctionState.currentPlayer.role} |{" "}
                            {auctionState.currentPlayer.nationality}
                          </p>
                          <p className="text-lg text-gray-400 mt-2">
                            Base:{" "}
                            <strong>
                              {formatCurrency(
                                auctionState.currentPlayer.basePrice
                              )}
                            </strong>
                          </p>
                        </div>
                      </div>
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
                    <div className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
                      <p className="text-center text-gray-400 text-sm">
                        CURRENT BID
                      </p>
                      <div className="text-7xl font-bold text-green-400 text-center my-4">
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={auctionState.currentBid}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                          >
                            {formatCurrency(auctionState.currentBid)}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {quickIncrements.map((inc) => (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={inc}
                            onClick={() => handleBidUpdate(inc)}
                            className="px-4 py-2 bg-blue-600/50 hover:bg-blue-600 rounded-md font-semibold transition-colors"
                          >
                            + {formatCurrency(inc)}
                          </motion.button>
                        ))}
                        <div className="flex items-center gap-2">
                          <div className="w-48">
                            <CurrencyInput
                              value={customIncrement.value}
                              unit={customIncrement.unit}
                              onValueChange={(e) =>
                                setCustomIncrement((p) => ({
                                  ...p,
                                  value: e.target.value,
                                }))
                              }
                              onUnitChange={(e) =>
                                setCustomIncrement((p) => ({
                                  ...p,
                                  unit: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCustomBidUpdate}
                            className="px-4 py-2 bg-purple-600/50 hover:bg-purple-600 rounded-md font-semibold transition-colors"
                          >
                            Add
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-200 mb-4">
                        Finalize Sale
                      </h3>
                      <CustomTeamSelect
                        teams={teams}
                        selectedTeamId={soldToTeamId}
                        onSelect={setSoldToTeamId}
                      />
                    </div>
                    <div className="space-y-4 mt-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handleSellPlayer(auctionState.currentBid)
                        }
                        disabled={!soldToTeamId}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        SOLD
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleUnsoldPlayer}
                        className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-lg font-semibold text-lg transition-all"
                      >
                        UNSOLD
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-gray-500 py-20 bg-black/30 backdrop-blur-lg rounded-2xl border border-white/10"
                >
                  <h2 className="text-3xl font-bold">
                    Waiting for Auction to Start
                  </h2>
                  <p className="mt-2">
                    Use the sidebar to select and start a pool.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
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

      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 z-30">
        <div
          className={`transition-all duration-300 ${
            isSidebarOpen ? "pr-80" : ""
          }`}
        >
          <div className="flex justify-center items-center h-16">
            <div className="flex space-x-4 px-4 overflow-x-auto">
              {teams.map((team) => (
                <div
                  key={team._id}
                  className={`flex items-center space-x-2 p-2 rounded-lg flex-shrink-0 transition-colors ${
                    soldToTeamId === team._id ? "bg-blue-500/50" : ""
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: team.colorPrimary,
                      borderColor: team.colorAccent,
                    }}
                  ></div>
                  <span className="font-semibold text-sm truncate w-24">
                    {team.name}
                  </span>
                  <span className="text-green-400 text-sm font-mono">
                    {formatCurrency(team.purseRemaining)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 pb-2">
            IPL Auction Simulator - A Modern Bidding Experience
          </div>
        </div>
      </footer>
    </div>
  );
}
