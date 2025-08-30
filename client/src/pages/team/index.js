/********************************************************************************
 * --- FILE: client/src/pages/team/index.js (TeamDashboard - FINAL) ---
 ********************************************************************************/
// This is the complete and final version of the Team Dashboard.
// It includes the corrected data fetching logic to prevent crashes, the categorized
// squad view, opponent team viewing, and the live auction room with dynamic pools.

import React, { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";
import { io } from "socket.io-client";
import { formatCurrency, getTextColorForBackground } from "../../lib/utils";

// --- Reusable PlayerCard component ---
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 text-center transform transition-transform hover:scale-105 shadow-lg">
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
    </div>
  );
});

// --- Main TeamDashboard Component ---
export default function TeamDashboard() {
  const router = useRouter();
  const [myTeam, setMyTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [auctionState, setAuctionState] = useState(null);
  const [pools, setPools] = useState([]);
  const [activeTab, setActiveTab] = useState("auction_room");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/team/login");
      return;
    }

    const socket = io(
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
    );

    const fetchData = async () => {
      try {
        // Step 1: Fetch the logged-in team's data FIRST.
        const myTeamData = await api.teams.me();
        setMyTeam(myTeamData);
        setActiveTab(myTeamData._id);

        // Step 2: ONLY if Step 1 succeeds, use the tournament ID for subsequent calls.
        const tournamentId = myTeamData.tournament;
        if (!tournamentId) {
          throw new Error(
            "Tournament ID not found for this team. Please contact the administrator."
          );
        }

        const [allTeamsData, poolsData] = await Promise.all([
          api.tournaments.getTeams(tournamentId),
          api.pools.list(tournamentId),
        ]);
        setAllTeams(allTeamsData);
        setPools(poolsData);

        socket.emit("join_tournament", tournamentId);
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    socket.on("connect", () => console.log("Connected to socket server!"));
    socket.on("auction_state_update", (state) => setAuctionState(state));
    return () => socket.disconnect();
  }, [router]);

  const displayedTeamData = useMemo(() => {
    if (activeTab === "auction_room" || !allTeams.length) return null;
    const teamToShow = allTeams.find((t) => t._id === activeTab);
    if (!teamToShow || !teamToShow.players)
      return { team: teamToShow, groupedPlayers: {} };
    const grouped = teamToShow.players.reduce(
      (acc, player) => {
        const role = player.role + "s";
        if (!acc[role]) acc[role] = [];
        acc[role].push(player);
        return acc;
      },
      { Batters: [], Bowlers: [], Allrounders: [], Wicketkeepers: [] }
    );
    return { team: teamToShow, groupedPlayers: grouped };
  }, [activeTab, allTeams]);

  const renderContent = () => {
    if (activeTab === "auction_room") {
      return (
        <div className="space-y-6">
          {auctionState && auctionState.currentPlayer ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                  Currently Bidding
                </h3>
                <div className="text-center bg-gray-900 p-8 rounded-lg">
                  <p className="text-4xl font-bold">
                    {auctionState.currentPlayer.name}
                  </p>
                  <p className="text-xl text-gray-400">
                    {auctionState.currentPlayer.role}
                  </p>
                  <div className="my-4">
                    <span
                      className={`text-lg font-semibold px-4 py-1 mt-2 rounded-full inline-block ${
                        auctionState.currentPlayer.nationality === "Overseas"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    >
                      {auctionState.currentPlayer.nationality}
                    </span>
                  </div>
                  <p className="text-2xl font-light">
                    Base Price:{" "}
                    <span className="font-bold">
                      {formatCurrency(auctionState.currentPlayer.basePrice)}
                    </span>
                  </p>
                  <p className="text-4xl font-bold mt-4 text-green-400">
                    Current Bid: {formatCurrency(auctionState.currentBid)}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-2xl font-bold text-blue-400 mb-4">
                  Upcoming in Pool
                </h3>
                <div className="space-y-2">
                  {auctionState.upcomingPlayers?.map((p) => (
                    <div
                      key={p._id}
                      className="bg-gray-700 p-2 rounded text-sm"
                    >
                      <span className="font-semibold">{p.name}</span> ({p.role})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20">
              Waiting for auction to start...
            </div>
          )}

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-2xl font-bold text-gray-200 mb-4">
              Auction Pools
            </h3>
            <div className="flex flex-wrap gap-3">
              {pools.map((pool) => (
                <div
                  key={pool._id}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                    pool.isCompleted
                      ? "bg-gray-600 text-gray-400"
                      : pool.name === auctionState?.currentPool
                      ? "bg-yellow-500 text-black animate-pulse"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {pool.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!displayedTeamData)
      return (
        <div className="text-center text-gray-500 py-10">
          Select a team to view their squad.
        </div>
      );

    const { team, groupedPlayers } = displayedTeamData;
    return (
      <div className="space-y-8">
        {Object.entries(groupedPlayers).map(
          ([role, players]) =>
            players.length > 0 && (
              <div key={role}>
                <h3
                  className="text-2xl font-bold mb-4"
                  style={{ color: team.colorAccent }}
                >
                  {role}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {players.map((p) => (
                    <PlayerCard
                      key={p._id}
                      player={p}
                      accentColor={team.colorAccent}
                    />
                  ))}
                </div>
              </div>
            )
        )}
        {team.players.length === 0 && (
          <p className="text-center text-gray-400 py-10">
            This team has no players yet.
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading Team Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-bold mb-4">An Error Occurred</h2>
        <p className="text-red-200 bg-red-800 p-4 rounded-md">{error}</p>
        <p className="mt-4 text-red-300">Please try logging in again.</p>
      </div>
    );
  }

  if (!myTeam) {
    return null;
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ background: myTeam.colorPrimary }}
    >
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1
              className="text-4xl font-bold"
              style={{ color: myTeam.colorAccent }}
            >
              {myTeam.name}
            </h1>
            <p className="text-white text-opacity-80">
              Purse Remaining: {formatCurrency(myTeam.purseRemaining)}
            </p>
          </div>
          <Link
            href="/team/submission"
            className="mt-4 md:mt-0 px-6 py-2 rounded-lg font-semibold transition-transform transform hover:scale-105"
            style={{
              background: myTeam.colorAccent,
              color: getTextColorForBackground(myTeam.colorAccent),
            }}
          >
            Go to Squad Submission
          </Link>
        </header>

        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("auction_room")}
            className={`px-4 py-2 font-semibold flex-shrink-0 ${
              activeTab === "auction_room"
                ? "border-b-2 text-yellow-400 border-yellow-400"
                : "text-gray-400"
            }`}
          >
            Auction Room
          </button>
          {allTeams.map((t) => (
            <button
              key={t._id}
              onClick={() => setActiveTab(t._id)}
              className={`px-4 py-2 font-semibold flex-shrink-0 ${
                activeTab === t._id
                  ? "border-b-2 text-white border-white"
                  : "text-gray-400"
              }`}
            >
              {t._id === myTeam._id ? "My Squad" : t.name}
            </button>
          ))}
        </div>

        <div>{renderContent()}</div>
      </div>
    </div>
  );
}
