import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken, setToken } from "../../lib/api";

// --- Reusable Components (Notification, ConfirmationModal, CurrencyInput) ---
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

const ConfirmationModal = memo(function ConfirmationModal({
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 text-center w-full max-w-md">
        <p className="text-lg mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold transition-colors"
          >
            Confirm Delete
          </button>
        </div>
      </div>
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
    <div className="flex items-center relative bg-gray-700 border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-blue-500">
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
        className="bg-gray-600 h-full rounded-r-md px-2 text-sm appearance-none focus:outline-none"
      >
        <option>Lakhs</option>
        <option>Crores</option>
      </select>
    </div>
  );
});

export default function AdminDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [title, setTitle] = useState("");
  const [selTournament, setSelTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [minSquadSize, setMinSquadSize] = useState(15);
  const [maxSquadSize, setMaxSquadSize] = useState(18);
  const [overseasLimit, setOverseasLimit] = useState(6);

  // --- NEW: State for editing a team ---
  const [editingTeam, setEditingTeam] = useState(null);

  const initialTeamState = {
    name: "",
    username: "",
    password: "",
    purse: { value: 100, unit: "Crores" },
    colorPrimary: "#0A2342",
    colorAccent: "#FFD700",
  };

  const [teamData, setTeamData] = useState(initialTeamState);

  const handleLogout = useCallback(() => {
    setToken(null);
    router.push("/");
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
    } else {
      api.auth.meAdmin().then(setAdmin).catch(handleLogout);
      refreshTournaments();
    }
  }, [router]);

  const refreshTournaments = useCallback(async () => {
    try {
      const r = await api.tournaments.my();
      setTournaments(r);
      if (selTournament) {
        const updatedSel = r.find((t) => t._id === selTournament._id);
        setSelTournament(updatedSel || null);
      }
    } catch (e) {
      setNotification({
        message: "Failed to fetch tournaments: " + e.message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selTournament]);

  const createTournament = useCallback(async () => {
    if (!title)
      return setNotification({
        message: "Tournament title is required",
        type: "error",
      });
    try {
      await api.tournaments.create({
        title,
        minSquadSize,
        maxSquadSize,
        maxOverseasPlayers: overseasLimit,
      });
      setTitle("");
      await refreshTournaments();
      setNotification({
        message: "Tournament created successfully!",
        type: "success",
      });
    } catch (e) {
      setNotification({
        message: "Error creating tournament: " + e.message,
        type: "error",
      });
    }
  }, [title, minSquadSize, maxSquadSize, overseasLimit, refreshTournaments]);

  // --- RENAMED & UPDATED: Handles both Create and Update ---
  const handleTeamSubmit = useCallback(async () => {
    if (!selTournament)
      return setNotification({
        message: "Please select a tournament first",
        type: "error",
      });
    if (!teamData.name || !teamData.username) {
      return setNotification({
        message: "Team Name and Username are required",
        type: "error",
      });
    }
    // Password is only required when creating a new team
    if (!editingTeam && !teamData.password) {
      return setNotification({
        message: "Password is required for new teams",
        type: "error",
      });
    }

    try {
      if (editingTeam) {
        // Update existing team
        await api.tournaments.updateTeam(
          selTournament._id,
          editingTeam._id,
          teamData
        );
        setNotification({
          message: "Team updated successfully!",
          type: "success",
        });
      } else {
        // Create new team
        await api.tournaments.createTeam(selTournament._id, teamData);
        setNotification({
          message: "Team created successfully!",
          type: "success",
        });
      }
      setTeamData(initialTeamState);
      setEditingTeam(null);
      await refreshTournaments();
    } catch (e) {
      setNotification({
        message: `Error: ${e.message}`,
        type: "error",
      });
    }
  }, [selTournament, teamData, editingTeam, refreshTournaments]);

  const handleDeleteRequest = useCallback(
    (type, item) => {
      setConfirmModal({
        message: `Delete ${type} "${
          item.name || item.title
        }"? This is permanent.`,
        onConfirm: () => {
          if (type === "team" && selTournament)
            deleteTeam(selTournament._id, item._id);
          if (type === "tournament") deleteTournament(item._id);
        },
      });
    },
    [selTournament]
  );

  const deleteTeam = useCallback(
    async (tournamentId, teamId) => {
      try {
        await api.tournaments.deleteTeam(tournamentId, teamId);
        setNotification({
          message: "Team deleted successfully.",
          type: "success",
        });
        await refreshTournaments();
      } catch (e) {
        setNotification({
          message: "Error deleting team: " + e.message,
          type: "error",
        });
      } finally {
        setConfirmModal(null);
      }
    },
    [refreshTournaments]
  );

  const deleteTournament = useCallback(
    async (tournamentId) => {
      try {
        await api.tournaments.delete(tournamentId);
        setNotification({ message: "Tournament deleted.", type: "success" });
        setSelTournament(null);
        await refreshTournaments();
      } catch (e) {
        setNotification({
          message: "Error deleting tournament: " + e.message,
          type: "error",
        });
      } finally {
        setConfirmModal(null);
      }
    },
    [refreshTournaments]
  );

  // --- NEW: Handlers for Edit and Impersonate ---
  const handleEditTeam = useCallback((team) => {
    setEditingTeam(team);
    const purseInCrores = team.purseRemaining / 10000000;
    setTeamData({
      name: team.name,
      username: team.username,
      password: "", // Leave password blank for editing
      purse: { value: purseInCrores, unit: "Crores" },
      colorPrimary: team.colorPrimary,
      colorAccent: team.colorAccent,
    });
  }, []);

  const handleCancelEdit = () => {
    setEditingTeam(null);
    setTeamData(initialTeamState);
  };

  const handleImpersonateTeam = (team) => {
    // This is a placeholder for a more complex feature.
    // To implement fully:
    // 1. Create a backend route for admins to get a temporary team token.
    // 2. Call that route here, get the token.
    // 3. Save the token with setToken(tempToken).
    // 4. router.push('/team');
    setNotification({
      message: `Impersonate feature not yet built. Would log in as ${team.name}.`,
      type: "success",
    });
  };

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

  if (isLoading || !admin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {confirmModal && (
        <ConfirmationModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700">
          <div>
            <h1 className="text-4xl font-bold text-blue-400">
              Admin Dashboard
            </h1>
            <p className="text-lg font-semibold text-gray-200 mt-1">
              Welcome, <span className="text-yellow-400">{admin.name}</span>!
            </p>
          </div>
          <button
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
          </button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              Manage Tournaments
            </h2>
            <div className="space-y-4 mb-6">
              <input
                placeholder="New Tournament Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded-md"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">
                    Min Squad Size
                  </label>
                  <input
                    type="number"
                    value={minSquadSize}
                    onChange={(e) => setMinSquadSize(Number(e.target.value))}
                    className="w-full p-2 bg-gray-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">
                    Max Squad Size
                  </label>
                  <input
                    type="number"
                    value={maxSquadSize}
                    onChange={(e) => setMaxSquadSize(Number(e.target.value))}
                    className="w-full p-2 bg-gray-700 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">
                  Max Overseas Players
                </label>
                <input
                  type="number"
                  value={overseasLimit}
                  onChange={(e) => setOverseasLimit(Number(e.target.value))}
                  className="w-full p-2 bg-gray-700 rounded-md"
                />
              </div>
              <button
                onClick={createTournament}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
              >
                Create Tournament
              </button>
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
                      ? "bg-blue-900 border-blue-600"
                      : "bg-gray-700 border-gray-600"
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
                  <div className="mt-2 pt-2 border-t border-gray-600 flex gap-2">
                    <Link
                      href={`/admin/auction/${t._id}`}
                      className="flex-1 text-center px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-md font-semibold"
                    >
                      Run Auction
                    </Link>
                    <Link
                      href={`/admin/submissions/${t._id}`}
                      className="flex-1 text-center px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold"
                    >
                      View Submissions
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              {editingTeam
                ? `Editing "${editingTeam.name}"`
                : selTournament
                ? `Manage Teams for "${selTournament.title}"`
                : "Select a Tournament"}
            </h2>
            {selTournament ? (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <input
                    placeholder="Team Name"
                    name="name"
                    value={teamData.name}
                    onChange={handleTeamFormChange}
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md"
                  />
                  <input
                    placeholder="Team Username"
                    name="username"
                    value={teamData.username}
                    onChange={handleTeamFormChange}
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md"
                  />
                  <input
                    placeholder={
                      editingTeam ? "New Password (optional)" : "Team Password"
                    }
                    name="password"
                    type="password"
                    value={teamData.password}
                    onChange={handleTeamFormChange}
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md"
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
                  <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        name="colorPrimary"
                        value={teamData.colorPrimary}
                        onChange={handleTeamFormChange}
                        className="w-full h-10 p-1 bg-gray-700 rounded-md"
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
                        className="w-full h-10 p-1 bg-gray-700 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  {editingTeam && (
                    <button
                      onClick={handleCancelEdit}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleTeamSubmit}
                    className={`w-full py-2 ${
                      editingTeam
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-green-600 hover:bg-green-700"
                    } rounded-md font-semibold`}
                  >
                    {editingTeam ? "Update Team" : "Create Team"}
                  </button>
                </div>
                <hr className="my-6 border-gray-600" />
                <h3 className="text-xl font-semibold mb-2 text-gray-300">
                  Created Teams
                </h3>
                <div className="space-y-2">
                  {selTournament.teams?.map((team) => (
                    <div
                      key={team._id}
                      className="flex items-center justify-between bg-gray-700 p-2 rounded-md group"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{
                            backgroundColor: team.colorPrimary,
                            border: `2px solid ${team.colorAccent}`,
                          }}
                        ></div>
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleImpersonateTeam(team)}
                          className="text-gray-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Impersonate Team"
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
                              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.27 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-gray-400 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Team"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path
                              fillRule="evenodd"
                              d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRequest("team", team)}
                          className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Team"
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
          </div>
        </div>
      </div>
    </div>
  );
}
