import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { io } from "socket.io-client";
import { formatCurrency } from "../lib/utils";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

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
      className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-gray-900 to-black"
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
    <div className="flex items-center relative bg-gray-700/50 border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
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
        className="bg-gray-800/80 h-full rounded-r-md px-2 text-sm appearance-none focus:outline-none"
      >
        <option>Lakhs</option>
        <option>Crores</option>
      </select>
    </div>
  );
});

// StatDisplay remains the same...

// AuctionSidebar remains the same...

// --- Main Component ---
export default function AuctionRoom({ tournamentId, token, router }) {
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

  // Socket and data fetching useEffect
  useEffect(() => {
    if (!tournamentId || !token) {
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
  }, [tournamentId, token, router]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex overflow-hidden">
      <ThreeJSCanvas />
      <Notification
        message={notification?.message}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />

      <main
        className={`flex-grow p-4 md:p-8 transition-all duration-300 relative pb-20 ${
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
                  <div className="bg-black/30 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
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
                  <div className="bg-black/30 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl">
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
                <div className="bg-black/30 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-200 mb-4">
                      Finalize Sale
                    </h3>
                    <select
                      value={soldToTeamId}
                      onChange={(e) => setSoldToTeamId(e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Winning Team --</option>
                      {teams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSellPlayer(auctionState.currentBid)}
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

      <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10 z-30">
        <div
          className={`flex justify-center items-center h-16 transition-all duration-300 ${
            isSidebarOpen ? "pr-80" : ""
          }`}
        >
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
      </footer>
    </div>
  );
}
