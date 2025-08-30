import React, { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../../lib/api";
import { formatCurrency, getTextColorForBackground } from "../../../lib/utils";

// Reusable PlayerCard for this page
const PlayerCard = memo(function PlayerCard({
  player,
  accentColor,
  isCaptain,
  isVC,
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center shadow-lg relative border border-gray-700">
      <div className="font-bold text-lg" style={{ color: accentColor }}>
        {player.name}
      </div>
      <div className="text-gray-400 text-sm">{player.role}</div>
      <div className="text-green-400 font-semibold text-sm mt-1">
        {formatCurrency(player.soldPrice)}
      </div>
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
    </div>
  );
});

export default function AdminSubmissionsViewer() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournament, setTournament] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grade, setGrade] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubmissions = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const subs = await api.submissions.getByTournament(tournamentId);
      setSubmissions(subs);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  }, [tournamentId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    if (tournamentId) {
      api.tournaments.getById(tournamentId).then(setTournament);
      refreshSubmissions().finally(() => setIsLoading(false));
    }
  }, [tournamentId, router]);

  const handleLock = async (teamId, isLocked) => {
    await api.submissions.lock(teamId, isLocked);
    refreshSubmissions();
  };

  const handleGrade = async (teamId) => {
    if (!grade) return;
    await api.submissions.grade(teamId, grade);
    setGrade("");
    refreshSubmissions();
  };

  const selectedTeam = tournament?.teams.find(
    (t) => t._id === selectedSubmission?.team
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400">
            Submissions: {tournament?.title}
          </h1>
          <Link href="/admin" className="text-blue-400 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: List of Teams */}
          <div className="md:col-span-1 bg-gray-800 p-6 rounded-lg border border-gray-700 h-fit">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">Teams</h2>
            <ul className="space-y-2">
              {tournament?.teams.map((team) => {
                const submission = submissions.find((s) => s.team === team._id);
                return (
                  <li
                    key={team._id}
                    onClick={() =>
                      submission && setSelectedSubmission(submission)
                    }
                    className={`p-3 rounded-md border flex justify-between items-center ${
                      submission ? "cursor-pointer" : "cursor-not-allowed"
                    } ${
                      selectedSubmission?.team === team._id
                        ? "bg-blue-900 border-blue-600"
                        : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                    }`}
                  >
                    <span>{team.name}</span>
                    {submission ? (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          submission.locked ? "bg-red-500" : "bg-green-500"
                        }`}
                      >
                        {submission.locked ? "Locked" : "Submitted"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Pending</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right Column: Submission Details */}
          <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
            {selectedSubmission && selectedTeam ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2
                    className="text-3xl font-bold"
                    style={{ color: selectedTeam.colorAccent }}
                  >
                    {selectedTeam.name}'s Submission
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        handleLock(
                          selectedSubmission.team,
                          !selectedSubmission.locked
                        )
                      }
                      className={`px-4 py-2 rounded-md font-semibold ${
                        selectedSubmission.locked
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {selectedSubmission.locked ? "Unlock" : "Lock"}
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3
                      className="text-2xl font-semibold mb-4"
                      style={{ color: selectedTeam.colorAccent }}
                    >
                      Playing XI ({selectedSubmission.playingXI.length}/11)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedSubmission.playingXI.map((p) => (
                        <PlayerCard
                          key={p._id}
                          player={p}
                          accentColor={selectedTeam.colorAccent}
                          isCaptain={p._id === selectedSubmission.captain?._id}
                          isVC={p._id === selectedSubmission.viceCaptain?._id}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-semibold mb-4"
                      style={{ color: selectedTeam.colorAccent }}
                    >
                      Full Squad ({selectedSubmission.squad.length}/15)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedSubmission.squad.map((p) => (
                        <PlayerCard
                          key={p._id}
                          player={p}
                          accentColor={selectedTeam.colorAccent}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                  <h3 className="text-xl font-semibold mb-2">
                    Grade Submission
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder={`Current Grade: ${
                        selectedSubmission.grade || "N/A"
                      }`}
                      className="flex-grow p-2 bg-gray-700 rounded-md"
                    />
                    <button
                      onClick={() => handleGrade(selectedSubmission.team)}
                      className="px-4 py-2 bg-green-600 rounded-md"
                    >
                      Save Grade
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a submitted team to view their squad.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
