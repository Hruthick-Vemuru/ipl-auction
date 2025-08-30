/********************************************************************************
 * --- FILE: client/src/pages/admin/index.js (AdminDashboard) ---
 ********************************************************************************/
// This is the complete and final code for the Admin Dashboard.
// It includes the corrected focus styles, delete functionality, and the
// logic for the new "embedded teams" data structure.

import React, { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";

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

// --- Reusable Confirmation Modal Component ---
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

// --- Reworked Currency Input Component ---
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
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const [teamData, setTeamData] = useState({
    name: "",
    username: "",
    password: "",
    purse: { value: 100, unit: "Crores" },
    colorPrimary: "#ff0000",
    colorAccent: "#ffd700",
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
    } else {
      refreshTournaments();
    }
  }, [router]);

  const refreshTournaments = useCallback(async () => {
    try {
      const r = await api.tournaments.my();
      setTournaments(r);
      // If a tournament was selected, refresh its data too
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

  // This effect now correctly handles fetching teams from the selected tournament
  useEffect(() => {
    if (selTournament) {
      setTeams(selTournament.teams || []);
    } else {
      setTeams([]);
    }
  }, [selTournament]);

  const createTournament = useCallback(async () => {
    if (!title)
      return setNotification({
        message: "Tournament title is required",
        type: "error",
      });
    try {
      await api.tournaments.create({ title });
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
  }, [title, refreshTournaments]);

  const createTeam = useCallback(async () => {
    if (!selTournament)
      return setNotification({
        message: "Please select a tournament first",
        type: "error",
      });
    if (!teamData.name || !teamData.username || !teamData.password) {
      return setNotification({
        message: "Team Name, Username, and Password are required",
        type: "error",
      });
    }
    try {
      await api.tournaments.createTeam(selTournament._id, teamData);
      setNotification({
        message: "Team created successfully!",
        type: "success",
      });
      setTeamData({
        name: "",
        username: "",
        password: "",
        purse: { value: 100, unit: "Crores" },
        colorPrimary: "#ff0000",
        colorAccent: "#ffd700",
      });
      await refreshTournaments(); // Refresh everything to get the updated tournament doc
    } catch (e) {
      setNotification({
        message: "Error creating team: " + e.message,
        type: "error",
      });
    }
  }, [selTournament, teamData, refreshTournaments]);

  const handleDeleteRequest = useCallback(
    (type, item) => {
      setConfirmModal({
        message: `Are you sure you want to permanently delete the ${type} "${
          item.name || item.title
        }"?`,
        onConfirm: () => {
          if (type === "team" && selTournament) {
            deleteTeam(selTournament._id, item._id);
          } else if (type === "tournament") {
            deleteTournament(item._id);
          }
        },
      });
    },
    [selTournament]
  ); // Dependency on selTournament is correct

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading Admin Dashboard...
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
        <h1 className="text-4xl font-bold text-blue-400 mb-8">
          Admin Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              Manage Tournaments
            </h2>
            <div className="flex gap-2 mb-6">
              <input
                placeholder="New Tournament Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              />
              <button
                onClick={createTournament}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
              >
                Create
              </button>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-300">
              Your Tournaments
            </h3>
            <ul className="space-y-2">
              {tournaments.map((t) => (
                <li
                  key={t._id}
                  className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                    selTournament?._id === t._id
                      ? "bg-blue-900 border-blue-600"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                >
                  <div
                    onClick={() => setSelTournament(t)}
                    className="cursor-pointer flex-grow"
                  >
                    <span className="font-semibold">{t.title}</span> — Code:{" "}
                    <b className="text-yellow-400 tracking-wider">{t.code}</b>
                  </div>
                  <Link
                    href={`/admin/auction/${t._id}`}
                    className="ml-4 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-md font-semibold"
                  >
                    Run Auction
                  </Link>
                  <button
                    onClick={() => handleDeleteRequest("tournament", t)}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
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
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">
              {selTournament
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
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                  />
                  <input
                    placeholder="Team Username"
                    name="username"
                    value={teamData.username}
                    onChange={handleTeamFormChange}
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                  />
                  <input
                    placeholder="Team Password"
                    name="password"
                    type="password"
                    value={teamData.password}
                    onChange={handleTeamFormChange}
                    className="p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
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
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      name="colorPrimary"
                      value={teamData.colorPrimary}
                      onChange={handleTeamFormChange}
                      className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
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
                      className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={createTeam}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold transition-colors"
                >
                  Create Team
                </button>
                <hr className="my-6 border-gray-600" />
                <h3 className="text-xl font-semibold mb-2 text-gray-300">
                  Created Teams
                </h3>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team._id}
                      className="flex items-center justify-between bg-gray-700 p-2 rounded-md"
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
                      <button
                        onClick={() => handleDeleteRequest("team", team)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
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
                  ))}
                  {teams.length === 0 && (
                    <p className="text-gray-400">
                      No teams created yet for this tournament.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>
                  Please select a tournament from the left to manage its teams.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
