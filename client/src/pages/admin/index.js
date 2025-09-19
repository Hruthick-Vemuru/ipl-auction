import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken, setToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { getTextColorForBackground } from "@/lib/utils";
import { iplTeams } from "@/lib/iplTeams";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [title, setTitle] = useState("");
  const [selTournament, setSelTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("custom");
  const [selectedIplTeam, setSelectedIplTeam] = useState("");

  // Tournament settings state
  const [tournamentSettings, setTournamentSettings] = useState({
    minSquadSize: 11,
    maxSquadSize: 18,
    maxOverseasPlayers: 6,
  });

  const [teamData, setTeamData] = useState({
    id: null,
    name: "",
    username: "",
    password: "",
    purse: { value: 100, unit: "Crores" },
    colorPrimary: "#0A2342",
    colorAccent: "#FFD700",
    logo: "",
  });

  const handleLogout = useCallback(() => {
    // Also clear impersonation token on logout
    if (typeof window !== "undefined") {
      localStorage.removeItem("originalAdminToken");
    }
    setToken(null);
    router.push("/");
  }, [router]);

  // --- Impersonation Handler ---
  const handleImpersonate = useCallback(
    async (teamId) => {
      try {
        const adminToken = getToken();
        if (!adminToken) throw new Error("Admin token not found");

        // Save the original admin token before switching
        if (typeof window !== "undefined") {
          localStorage.setItem("originalAdminToken", adminToken);
        }

        const res = await api.auth.impersonateTeam(teamId);
        setToken(res.token); // Set the new team token
        router.push("/team"); // Redirect to the team dashboard
      } catch (e) {
        setNotification({ message: e.message, type: "error" });
        // Clean up if impersonation fails
        if (typeof window !== "undefined") {
          localStorage.removeItem("originalAdminToken");
        }
      }
    },
    [router]
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
    } else {
      api.auth
        .meAdmin()
        .then(setAdmin)
        .catch(() => router.push("/admin/login"));
      refreshTournaments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const refreshTournaments = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await api.tournaments.my();
      setTournaments(r);
      if (selTournament) {
        const updatedSel = r.find((t) => t._id === selTournament._id);
        setSelTournament(updatedSel || null);
      }
    } catch (e) {
      setNotification({
        message: "Failed to fetch tournaments",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selTournament]);

  const createTournament = useCallback(async () => {
    if (!title)
      return setNotification({ message: "Title required", type: "error" });
    try {
      await api.tournaments.create({ title, ...tournamentSettings });
      setTitle("");
      await refreshTournaments();
      setNotification({ message: "Tournament created!", type: "success" });
    } catch (e) {
      setNotification({ message: e.message, type: "error" });
    }
  }, [title, tournamentSettings, refreshTournaments]);

  const resetTeamForm = () => {
    setIsEditing(false);
    setTeamData({
      id: null,
      name: "",
      username: "",
      password: "",
      purse: { value: 100, unit: "Crores" },
      colorPrimary: "#0A2342",
      colorAccent: "#FFD700",
      logo: "",
    });
    setSelectedIplTeam("");
  };

  const handleTeamSubmit = async () => {
    if (!selTournament) return;
    if (
      !teamData.name ||
      !teamData.username ||
      (!teamData.password && !isEditing)
    ) {
      return setNotification({
        message: "All team fields are required",
        type: "error",
      });
    }
    try {
      if (isEditing) {
        await api.tournaments.updateTeam(
          selTournament._id,
          teamData.id,
          teamData
        );
        setNotification({ message: "Team updated!", type: "success" });
      } else {
        await api.tournaments.createTeam(selTournament._id, teamData);
        setNotification({ message: "Team created!", type: "success" });
      }
      resetTeamForm();
      await refreshTournaments();
    } catch (e) {
      setNotification({ message: e.message, type: "error" });
    }
  };

  const handleEditTeam = (team) => {
    setIsEditing(true);
    setTeamData({
      id: team._id,
      name: team.name,
      username: team.username,
      password: "", // Password field is cleared for security
      purse: {
        value:
          team.purseRemaining >= 10000000
            ? team.purseRemaining / 10000000
            : team.purseRemaining / 100000,
        unit: team.purseRemaining >= 10000000 ? "Crores" : "Lakhs",
      },
      colorPrimary: team.colorPrimary,
      colorAccent: team.colorAccent,
      logo: team.logo || "",
    });
    setActiveTab("custom");
  };

  const deleteTeam = useCallback(
    async (tournamentId, teamId) => {
      try {
        await api.tournaments.deleteTeam(tournamentId, teamId);
        await refreshTournaments();
      } catch (e) {
        setNotification({ message: e.message, type: "error" });
      }
    },
    [refreshTournaments]
  );

  const deleteTournament = useCallback(
    async (tournamentId) => {
      try {
        await api.tournaments.delete(tournamentId);
        setSelTournament(null);
        await refreshTournaments();
      } catch (e) {
        setNotification({ message: e.message, type: "error" });
      }
    },
    [refreshTournaments]
  );

  const handleDeleteRequest = useCallback(
    (type, item) => {
      setConfirmModal({
        message: `Delete ${type} "${
          item.name || item.title
        }"? This is permanent.`,
        onConfirm: () => {
          if (type === "team" && selTournament) {
            deleteTeam(selTournament._id, item._id);
          }
          if (type === "tournament") {
            deleteTournament(item._id);
          }
          setConfirmModal(null);
        },
        onCancel: () => setConfirmModal(null),
      });
    },
    [selTournament, deleteTeam, deleteTournament]
  );

  const handleTeamFormChange = (e) =>
    setTeamData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePurseValueChange = (e) =>
    setTeamData((prev) => ({
      ...prev,
      purse: { ...prev.purse, value: e.target.value },
    }));
  const handlePurseUnitChange = (e) =>
    setTeamData((prev) => ({
      ...prev,
      purse: { ...prev.purse, unit: e.target.value },
    }));
  const handleTournamentSettingsChange = (e) =>
    setTournamentSettings((prev) => ({
      ...prev,
      [e.target.name]: Number(e.target.value),
    }));

  const handleIplTeamSelect = (e) => {
    const teamName = e.target.value;
    setSelectedIplTeam(teamName);
    const team = iplTeams.find((t) => t.name === teamName);
    if (team) {
      setTeamData((prev) => ({
        ...prev,
        name: team.name,
        colorPrimary: team.colorPrimary,
        colorAccent: team.colorAccent,
        logo: team.logo,
      }));
    }
  };

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <ThreeJSCanvas />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8">
      <ThreeJSCanvas />
      <AnimatePresence>
        {notification && (
          <Notification
            {...notification}
            onClose={() => setNotification(null)}
          />
        )}
        {confirmModal && <ConfirmationModal {...confirmModal} />}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Admin Dashboard
            </h1>
            <p className="text-lg font-semibold text-gray-200 mt-1">
              Welcome, <span className="text-yellow-400">{admin.name}</span>!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-md font-semibold transition-colors"
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
            </motion.button>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              Manage Tournaments
            </h2>
            <div className="space-y-4 mb-6">
              <input
                placeholder="New Tournament Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Min Squad</label>
                  <input
                    type="number"
                    name="minSquadSize"
                    value={tournamentSettings.minSquadSize}
                    onChange={handleTournamentSettingsChange}
                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Max Squad</label>
                  <input
                    type="number"
                    name="maxSquadSize"
                    value={tournamentSettings.maxSquadSize}
                    onChange={handleTournamentSettingsChange}
                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Max Overseas</label>
                  <input
                    type="number"
                    name="maxOverseasPlayers"
                    value={tournamentSettings.maxOverseasPlayers}
                    onChange={handleTournamentSettingsChange}
                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createTournament}
                className="w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-700 rounded-md font-semibold transition-colors"
              >
                Create Tournament
              </motion.button>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-300">
              Your Tournaments
            </h3>
            <ul className="space-y-2">
              {tournaments.map((t) => (
                <li
                  key={t._id}
                  className={`p-3 rounded-md border transition-colors ${
                    selTournament?._id === t._id
                      ? "bg-blue-900/50 border-blue-600"
                      : "bg-white/5 border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => setSelTournament(t)}
                      className="cursor-pointer flex-grow"
                    >
                      <span className="font-semibold">{t.title}</span> — Code:{" "}
                      <b className="text-yellow-400 tracking-wider">{t.code}</b>
                    </div>
                    <button
                      onClick={() => handleDeleteRequest("tournament", t)}
                      className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
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
                  <div className="mt-2 pt-2 border-t border-white/10 flex gap-2">
                    <Link
                      href={`/admin/run-auction/${t._id}`}
                      className="flex-1 text-center px-3 py-1 text-sm bg-green-600/80 hover:bg-green-700 rounded-md font-semibold"
                    >
                      Run Auction
                    </Link>
                    <Link
                      href={`/admin/auction/${t._id}`}
                      className="flex-1 text-center px-3 py-1 text-sm bg-gray-500/80 hover:bg-gray-600 rounded-md font-semibold"
                    >
                      Setup
                    </Link>
                    <Link
                      href={`/admin/submissions/${t._id}`}
                      className="flex-1 text-center px-3 py-1 text-sm bg-indigo-600/80 hover:bg-indigo-700 rounded-md font-semibold"
                    >
                      View Submissions
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-black/20 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              {selTournament
                ? `Manage Teams for "${selTournament.title}"`
                : "Select a Tournament"}
            </h2>
            {selTournament ? (
              <div>
                <div className="flex border-b border-white/10 mb-4">
                  <button
                    onClick={() => setActiveTab("custom")}
                    className={`flex-1 py-2 font-semibold ${
                      activeTab === "custom"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-400"
                    }`}
                  >
                    Create Custom Team
                  </button>
                  <button
                    onClick={() => setActiveTab("ipl")}
                    className={`flex-1 py-2 font-semibold ${
                      activeTab === "ipl"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-400"
                    }`}
                  >
                    Add Official IPL Team
                  </button>
                </div>

                {activeTab === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <input
                      placeholder="Team Name"
                      name="name"
                      value={teamData.name}
                      onChange={handleTeamFormChange}
                      className="p-2 bg-white/5 border border-white/20 rounded-md"
                    />
                    <input
                      placeholder="Team Username"
                      name="username"
                      value={teamData.username}
                      onChange={handleTeamFormChange}
                      className="p-2 bg-white/5 border border-white/20 rounded-md"
                    />
                    <input
                      placeholder={
                        isEditing ? "New Password (optional)" : "Team Password"
                      }
                      name="password"
                      type="password"
                      value={teamData.password}
                      onChange={handleTeamFormChange}
                      className="p-2 bg-white/5 border border-white/20 rounded-md"
                    />
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Initial Purse
                      </label>
                      <CurrencyInput
                        value={teamData.purse.value}
                        unit={teamData.purse.unit}
                        onValueChange={handlePurseValueChange}
                        onUnitChange={handlePurseUnitChange}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Primary Color
                          </label>
                          <input
                            type="color"
                            name="colorPrimary"
                            value={teamData.colorPrimary}
                            onChange={handleTeamFormChange}
                            className="w-full h-10 p-1 bg-white/5 rounded-md border border-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Accent Color
                          </label>
                          <input
                            type="color"
                            name="colorAccent"
                            value={teamData.colorAccent}
                            onChange={handleTeamFormChange}
                            className="w-full h-10 p-1 bg-white/5 rounded-md border border-white/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Live Gradient Preview
                        </label>
                        <div
                          className="w-full h-20 rounded-lg flex items-center justify-center border border-white/10"
                          style={{
                            backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), linear-gradient(45deg, ${teamData.colorPrimary}, ${teamData.colorAccent})`,
                          }}
                        >
                          <span
                            className="font-bold text-2xl tracking-wider"
                            style={{
                              color: teamData.colorAccent,
                              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                            }}
                          >
                            Team Preview
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "ipl" && (
                  <div className="space-y-4 mb-6">
                    <select
                      onChange={handleIplTeamSelect}
                      value={selectedIplTeam}
                      className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                    >
                      <option value="">Select an IPL Team</option>
                      {iplTeams.map((team) => (
                        <option key={team.name} value={team.name}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Team Username"
                      name="username"
                      value={teamData.username}
                      onChange={handleTeamFormChange}
                      className="p-2 bg-white/5 border border-white/20 rounded-md"
                    />
                    <input
                      placeholder="Team Password"
                      name="password"
                      type="password"
                      value={teamData.password}
                      onChange={handleTeamFormChange}
                      className="p-2 bg-white/5 border border-white/20 rounded-md"
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTeamSubmit}
                    className="w-full py-2 bg-green-600/80 hover:bg-green-700 rounded-md font-semibold"
                  >
                    {isEditing ? "Update Team" : "Create Team"}
                  </motion.button>
                  {isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetTeamForm}
                      className="px-4 py-2 bg-gray-600/80 hover:bg-gray-500 rounded-md"
                    >
                      Cancel
                    </motion.button>
                  )}
                </div>
                <hr className="my-6 border-white/10" />
                <h3 className="text-xl font-semibold mb-2 text-gray-300">
                  Created Teams
                </h3>
                <div className="space-y-2">
                  {selTournament.teams?.map((team) => (
                    <div
                      key={team._id}
                      className="flex items-center justify-between p-3 rounded-lg group"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${team.colorPrimary}, ${team.colorAccent})`,
                      }}
                    >
                      <div className="flex items-center">
                        {team.logo && (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-8 h-8 mr-3"
                          />
                        )}
                        <div
                          className="font-bold"
                          style={{
                            color: getTextColorForBackground(team.colorPrimary),
                          }}
                        >
                          {team.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleImpersonate(team._id)}
                          title="Impersonate Team"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            color: getTextColorForBackground(team.colorAccent),
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path
                              fillRule="evenodd"
                              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditTeam(team)}
                          title="Edit Team"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            color: getTextColorForBackground(team.colorAccent),
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRequest("team", team)}
                          title="Delete Team"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            color: getTextColorForBackground(team.colorAccent),
                          }}
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
                    </div>
                  ))}
                  {selTournament.teams?.length === 0 && (
                    <p className="text-gray-400">No teams created yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a tournament to manage its teams.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
