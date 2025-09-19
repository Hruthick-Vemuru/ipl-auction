import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../../lib/api";
import { formatCurrency } from "../../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// --- Reusable Components (Notification, ConfirmationModal, etc.) ---
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

const ConfirmationModal = memo(function ConfirmationModal({
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/10 text-center w-full max-w-md"
      >
        <p className="text-lg mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-md font-semibold transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold transition-colors"
          >
            Confirm
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
});

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

const SearchablePlayerInput = ({ onPlayerSelected }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length < 3) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.cricData.searchPlayers(searchTerm);
        setResults(data);
      } catch (error) {
        console.error("Failed to search players:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleSelect = (player) => {
    onPlayerSelected(player);
    setSearchTerm("");
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for a player by LAST NAME..."
        className="w-full p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isLoading && (
        <p className="text-sm text-gray-400 absolute mt-1">Searching...</p>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full bg-black/80 border border-white/10 backdrop-blur-lg rounded-md mt-1 max-h-60 overflow-y-auto">
          {results.map((player) => (
            <li
              key={player.id}
              onClick={() => handleSelect(player)}
              className="p-2 hover:bg-blue-500/30 cursor-pointer"
            >
              {player.fullname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AddPlayerForm = memo(function AddPlayerForm({ onPlayerAdded }) {
  const [player, setPlayer] = useState(null);
  const [basePrice, setBasePrice] = useState({ value: 20, unit: "Lakhs" });
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRole = (apiRoleName) => {
    if (!apiRoleName) return "Batter";
    const role = apiRoleName.toLowerCase();
    if (role.includes("wicketkeeper")) return "Wicketkeeper";
    if (role.includes("bowler")) return "Bowler";
    if (role.includes("allrounder")) return "Allrounder";
    return "Batter";
  };

  const handlePlayerSelected = async (selectedPlayer) => {
    try {
      setMsg("");
      const details = await api.cricData.getPlayerDetails(selectedPlayer.id);

      const role = getRole(details.position?.name);
      const nationality =
        details.country?.name === "India"
          ? "Indian"
          : details.country?.name || "Overseas";

      setPlayer({
        name: details.fullname,
        role: role,
        nationality: nationality,
        image_path: details.image_path,
        stats: details.stats || {},
        battingstyle: details.battingstyle,
      });
    } catch (error) {
      setMsg("Error fetching player details: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!player) {
      setMsg("Please select a player first.");
      return;
    }
    setIsSubmitting(true);
    setMsg("");
    try {
      const parseCurrency = (amount) => {
        const value = parseFloat(amount.value);
        if (isNaN(value)) return 0;
        return amount.unit === "Lakhs" ? value * 100000 : value * 10000000;
      };
      const payload = { ...player, basePrice: parseCurrency(basePrice) };
      await api.players.create(payload);
      setMsg(`Successfully added ${player.name}`);
      onPlayerAdded();
      setPlayer(null);
      setBasePrice({ value: 20, unit: "Lakhs" });
    } catch (err) {
      setMsg("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-200">
        Add New Player from Database
      </h3>
      {msg && (
        <p className="mb-2 text-sm text-center p-2 rounded-md bg-gray-700/50">
          {msg}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchablePlayerInput onPlayerSelected={handlePlayerSelected} />
        {player && (
          <div className="md:col-span-2 bg-black/30 p-4 rounded-lg border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <img
                src={player.image_path}
                alt={player.name}
                className="w-24 h-24 rounded-full mx-auto border-2 border-blue-400"
              />
              <p className="font-bold text-center mt-2">{player.name}</p>
            </div>
            <div className="flex flex-col justify-center">
              <p>
                <strong>Role:</strong> {player.role}
              </p>
              <p>
                <strong>Nationality:</strong> {player.nationality}
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="space-y-4 flex flex-col justify-center"
            >
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Base Price
                </label>
                <CurrencyInput
                  value={basePrice.value}
                  unit={basePrice.unit}
                  onValueChange={(e) =>
                    setBasePrice((p) => ({ ...p, value: e.target.value }))
                  }
                  onUnitChange={(e) =>
                    setBasePrice((p) => ({ ...p, unit: e.target.value }))
                  }
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-md font-semibold"
              >
                {isSubmitting ? "Adding..." : "Add Player to Auction"}
              </motion.button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// --- PlayerAssignmentList and PoolManager components ---
const PlayerAssignmentList = memo(function PlayerAssignmentList({
  title,
  players,
  onPlayerClick,
  onDeleteClick,
  isLoading,
  tournament,
}) {
  return (
    <div
      className={`bg-black/20 p-4 rounded-lg h-96 flex flex-col relative ${
        isLoading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p>Updating...</p>
        </div>
      )}
      <h3 className="font-semibold mb-2 flex-shrink-0">{title}</h3>
      <ul className="space-y-2 text-sm overflow-y-auto pr-2 flex-grow">
        {players.map((p) => {
          const team =
            p.status === "Sold"
              ? tournament.teams.find((t) => t._id === p.soldTo)
              : null;
          const bgColor = team
            ? team.colorPrimary
            : "rgba(255, 255, 255, 0.05)";
          const borderColor = team ? team.colorAccent : "transparent";

          return (
            <li
              key={p._id}
              className={`flex items-center justify-between p-2 rounded group transition-all duration-300`}
              style={{
                backgroundColor: p.status === "Sold" ? bgColor : "",
                border: p.status === "Sold" ? `2px solid ${borderColor}` : "",
              }}
            >
              <img
                src={p.image_path}
                alt={p.name}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
              <div
                onClick={() => onPlayerClick(p)}
                className="flex-grow cursor-pointer"
              >
                <p className="font-semibold">{p.name}</p>
                <div className="text-xs text-gray-400">
                  <span>{p.role}</span>
                  {p.status === "Sold" && (
                    <span className="text-green-400 font-bold ml-2">
                      {formatCurrency(p.soldPrice)}
                    </span>
                  )}
                  {p.status === "Unsold" && (
                    <span className="text-red-400 font-bold ml-2">UNSOLD</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDeleteClick(p)}
                className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
            </li>
          );
        })}
      </ul>
    </div>
  );
});

const PoolManager = memo(function PoolManager({
  tournamentId,
  tournament,
  onPoolsUpdate,
  onShowConfirm,
  refreshTrigger,
}) {
  const [pools, setPools] = useState([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const refreshData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [poolsData, unassignedData] = await Promise.all([
        api.tournaments.listPools(tournamentId),
        api.players.getUnassigned(tournamentId),
      ]);
      setPools(poolsData);
      onPoolsUpdate(poolsData);
      setUnassignedPlayers(unassignedData);
      if (!selectedPoolId && poolsData.length > 0) {
        setSelectedPoolId(poolsData[0]._id);
      } else if (
        selectedPoolId &&
        !poolsData.some((p) => p._id === selectedPoolId)
      ) {
        setSelectedPoolId(poolsData.length > 0 ? poolsData[0]._id : null);
      }
    } catch (error) {
      console.error("Failed to refresh pool data:", error);
    }
  }, [tournamentId, onPoolsUpdate, selectedPoolId]);

  useEffect(() => {
    refreshData();
  }, [tournamentId, refreshTrigger, refreshData]);

  const handleCreatePool = useCallback(async () => {
    if (!newPoolName) return;
    const newPool = await api.tournaments.createPool(tournamentId, {
      name: newPoolName,
      order: pools.length,
    });
    setNewPoolName("");
    await refreshData();
    setSelectedPoolId(newPool._id);
  }, [newPoolName, tournamentId, pools.length, refreshData]);

  const movePlayer = useCallback(
    (player, fromPoolId, toPoolId) => {
      const playerId = player._id;

      const executeMove = async () => {
        setIsMoving(true);
        try {
          if (fromPoolId === null) {
            // Moving from Unassigned to a Pool
            const targetPool = pools.find((p) => p._id === toPoolId);
            const updatedTargetPlayers = [
              ...targetPool.players.map((p) => p._id),
              playerId,
            ];
            await api.tournaments.updatePool(tournamentId, toPoolId, {
              players: updatedTargetPlayers,
            });
          } else {
            // Moving from a Pool to Unassigned (covers both unsold and confirmed sold player cases)
            await api.tournaments.removePlayerFromPool(
              tournamentId,
              fromPoolId,
              playerId
            );
          }
          await refreshData();
        } catch (error) {
          console.error("Failed to move player:", error);
        } finally {
          setIsMoving(false);
        }
      };

      if (player.status === "Sold" && fromPoolId !== null) {
        const team = tournament?.teams.find((t) => t._id === player.soldTo);
        onShowConfirm(
          `This player was sold to ${
            team ? team.name : "a team"
          }. Making them available again will remove them from the team and refund their purse. Are you sure?`,
          executeMove // The confirmation will trigger the move
        );
      } else {
        executeMove(); // For any other case, move directly
      }
    },
    [pools, tournamentId, tournament, refreshData, onShowConfirm]
  );

  const handleDeletePlayerRequest = useCallback(
    (player) => {
      onShowConfirm(
        `Delete player "${player.name}"? This action is permanent.`,
        async () => {
          setIsMoving(true);
          try {
            await api.players.delete(player._id);
            await refreshData();
          } catch (error) {
            console.error("Failed to delete player:", error);
          } finally {
            setIsMoving(false);
          }
        }
      );
    },
    [onShowConfirm, refreshData]
  );

  const handleDeletePoolRequest = useCallback(
    (pool) => {
      onShowConfirm(
        `Delete pool "${pool.name}"? Players will become unassigned.`,
        async () => {
          setIsMoving(true);
          try {
            await api.tournaments.deletePool(tournamentId, pool._id);
            setSelectedPoolId(null);
            await refreshData();
          } catch (error) {
            console.error("Failed to delete pool:", error);
          } finally {
            setIsMoving(false);
          }
        }
      );
    },
    [onShowConfirm, refreshData, tournamentId]
  );

  const selectedPool = pools.find((p) => p._id === selectedPoolId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl mt-8"
    >
      <h2 className="text-2xl font-semibold mb-4 text-gray-200">
        Pool Manager
      </h2>
      <div className="flex gap-2 mb-6">
        <input
          value={newPoolName}
          onChange={(e) => setNewPoolName(e.target.value)}
          placeholder="New Pool Name"
          className="flex-grow p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreatePool}
          className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-md font-semibold transition-colors"
        >
          Create Pool
        </motion.button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-black/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Pools</h3>
          <ul className="space-y-2">
            {pools.map((pool) => (
              <li
                key={pool._id}
                className={`flex items-center justify-between p-2 rounded-md transition-colors bg-white/5 hover:bg-white/10 group`}
              >
                <span
                  onClick={() => setSelectedPoolId(pool._id)}
                  className={`flex-grow cursor-pointer ${
                    selectedPoolId === pool._id ? "text-blue-400 font-bold" : ""
                  }`}
                >
                  {pool.name} ({pool.players.length})
                </span>
                <button
                  onClick={() => handleDeletePoolRequest(pool)}
                  className="ml-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
              </li>
            ))}
          </ul>
        </div>
        {selectedPool ? (
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <PlayerAssignmentList
              title="Unassigned Players"
              players={unassignedPlayers}
              onPlayerClick={(player) =>
                movePlayer(player, null, selectedPool._id)
              }
              onDeleteClick={handleDeletePlayerRequest}
              isLoading={isMoving}
              tournament={tournament}
            />
            <PlayerAssignmentList
              title={`Players in ${selectedPool.name}`}
              players={selectedPool.players}
              onPlayerClick={(player) =>
                movePlayer(player, selectedPool._id, null)
              }
              onDeleteClick={handleDeletePlayerRequest}
              isLoading={isMoving}
              tournament={tournament}
            />
          </div>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-gray-500 h-96 bg-black/20 rounded-lg">
            <p>Select or create a pool to assign players.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// --- Main AuctionControlRoom Component ---
export default function AuctionControlRoom() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournament, setTournament] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pools, setPools] = useState([]);
  const triggerRefresh = () => setRefreshKey((prevKey) => prevKey + 1);

  const handlePoolsUpdate = useCallback((newPools) => {
    setPools(newPools);
  }, []);

  const handleShowConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
    });
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api.tournaments.getById(tournamentId).then(setTournament);
  }, [tournamentId, router]);

  return (
    <div className="min-h-screen text-white p-4 md:p-8">
      <ThreeJSCanvas />
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        {confirmModal && <ConfirmationModal {...confirmModal} />}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Auction Setup
            </h1>
            <p className="text-gray-400">{tournament?.title}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/run-auction/${tournamentId}`}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-md font-semibold text-lg shadow-lg transition-transform hover:scale-105"
            >
              Go to Live Auction &rarr;
            </Link>
            <Link href="/admin" className="text-blue-400 hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="relative z-20">
          <AddPlayerForm onPlayerAdded={triggerRefresh} />
        </div>

        {tournamentId && (
          <PoolManager
            tournamentId={tournamentId}
            tournament={tournament}
            onPoolsUpdate={handlePoolsUpdate}
            onShowConfirm={handleShowConfirm}
            refreshTrigger={refreshKey}
          />
        )}
      </div>
    </div>
  );
}
