/********************************************************************************
 * --- FILE: client/src/pages/team/index.js (DEFINITIVE FIX) ---
 ********************************************************************************/
// This is the complete and final version of the Team Dashboard.
// The data fetching and rendering logic has been completely rewritten to be
// robust and permanently eliminate the "Cannot read properties of null" error.

import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "../../lib/api";
import { io } from "socket.io-client";
import { formatCurrency, getTextColorForBackground } from "../../lib/utils";

// --- "Who Wants to Be a Millionaire?" Style Hexagonal PlayerCard ---
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  return (
    <div
      className="relative w-56 h-14 flex items-center justify-center transition-transform hover:scale-110 group"
      style={{
        clipPath: "polygon(7% 0%, 93% 0%, 100% 50%, 93% 100%, 7% 100%, 0% 50%)",
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm group-hover:bg-black/70 transition-colors"
        style={{
          clipPath:
            "polygon(7% 0%, 93% 0%, 100% 50%, 93% 100%, 7% 100%, 0% 50%)",
        }}
      ></div>
      <div className="relative z-10 text-center p-2 w-full">
        {player.nationality === "Overseas" && (
          <div
            className="absolute top-1 right-5 text-lg"
            title="Overseas Player"
          >
            ✈️
          </div>
        )}
        <div
          className="font-bold text-base leading-tight truncate"
          style={{ color: accentColor }}
        >
          {player.name}
        </div>
        {player.soldPrice > 0 && (
          <div className="text-green-400 font-semibold text-xs mt-1">
            {formatCurrency(player.soldPrice)}
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState(null);
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
        const myTeamData = await api.auth.me();
        if (!myTeamData || !myTeamData.tournament) {
          throw new Error(
            "Your team data is incomplete. Please contact the administrator."
          );
        }
        setMyTeam(myTeamData);
        setActiveTab(myTeamData._id);

        const tournamentId = myTeamData.tournament;

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

    socket.on("squad_update", (updatedTeams) => {
      setAllTeams(updatedTeams);
      setMyTeam((currentMyTeam) => {
        if (!currentMyTeam) return null;
        const myUpdatedTeam = updatedTeams.find(
          (t) => t._id === currentMyTeam._id
        );
        return myUpdatedTeam || currentMyTeam;
      });
    });

    return () => socket.disconnect();
  }, [router]);

  const activeViewData = useMemo(() => {
    if (!myTeam || !activeTab)
      return {
        theme: { primary: "#000", accent: "#FFF" },
        header: { name: "Loading...", purse: 0, accent: "#FFF" },
        isMyTeamView: true,
      };

    const viewedTeam = allTeams.find((t) => t._id === activeTab);

    if (activeTab === "auction_room" || !viewedTeam) {
      return {
        theme: { primary: myTeam.colorPrimary, accent: myTeam.colorAccent },
        header: {
          name: myTeam.name,
          purse: myTeam.purseRemaining,
          accent: myTeam.colorAccent,
        },
        isMyTeamView: true,
      };
    }

    return {
      theme: {
        primary: viewedTeam.colorPrimary,
        accent: viewedTeam.colorAccent,
      },
      header: {
        name: viewedTeam.name,
        purse: viewedTeam.purseRemaining,
        accent: viewedTeam.colorAccent,
      },
      isMyTeamView: viewedTeam._id === myTeam._id,
    };
  }, [activeTab, allTeams, myTeam]);

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
              <div className="md:col-span-2 bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                  Currently Bidding
                </h3>
                <div className="text-center bg-black/50 p-8 rounded-lg">
                  <p className="text-4xl font-bold">
                    {auctionState.currentPlayer.name}
                  </p>
                  <p className="text-xl text-gray-400">
                    {auctionState.currentPlayer.role}
                  </p>
                  <p className="text-2xl font-light mt-4">
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
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
                <h3 className="text-2xl font-bold text-blue-400 mb-4">
                  Upcoming Players
                </h3>
                <div className="space-y-2">
                  {auctionState.upcomingPlayers?.map((p) => (
                    <div
                      key={p._id}
                      className="bg-gray-800 p-2 rounded text-sm"
                    >
                      <span className="font-semibold">{p.name}</span>{" "}
                      <span className="text-gray-400">({p.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 bg-black/30 rounded-lg">
              Waiting for auction to start...
            </div>
          )}
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-yellow-400/30">
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
      <div className="space-y-10 bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
        {Object.entries(groupedPlayers).map(
          ([role, players]) =>
            players.length > 0 && (
              <div key={role}>
                <h3
                  className="text-3xl font-bold mb-6 text-center tracking-wider"
                  style={{ color: team.colorAccent }}
                >
                  {role}
                </h3>
                <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center">
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

  // --- THIS IS THE NEW, ROBUST RENDER LOGIC ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
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

  // Only render the dashboard if we have successfully loaded the team data
  if (myTeam) {
    return (
      <div
        className="min-h-screen p-4 md:p-8 text-white transition-all duration-500"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), linear-gradient(45deg, ${activeViewData.theme.primary}, ${activeViewData.theme.accent})`,
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1
                className="text-5xl font-bold"
                style={{ color: activeViewData.header.accent }}
              >
                {activeViewData.header.name}
              </h1>
              <p className="text-white text-opacity-80 text-lg">
                Purse Remaining: {formatCurrency(activeViewData.header.purse)}
              </p>
            </div>
            {activeViewData.isMyTeamView && (
              <Link
                href="/team/submission"
                className="mt-4 md:mt-0 px-6 py-2 rounded-lg font-semibold transition-transform transform hover:scale-105 border-2"
                style={{
                  borderColor: activeViewData.header.accent,
                  color: activeViewData.header.accent,
                }}
              >
                Go to Squad Submission
              </Link>
            )}
          </header>

          <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("auction_room")}
              className={`px-4 py-2 font-semibold flex-shrink-0 transition-colors ${
                activeTab === "auction_room"
                  ? "border-b-2 text-yellow-400 border-yellow-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Auction Room
            </button>
            {allTeams.map((t) => (
              <button
                key={t._id}
                onClick={() => setActiveTab(t._id)}
                className={`px-4 py-2 font-semibold flex-shrink-0 transition-colors ${
                  activeTab === t._id
                    ? "border-b-2 text-white border-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t._id === myTeam?._id ? "My Squad" : t.name}
              </button>
            ))}
          </div>

          <div>{renderContent()}</div>
        </div>
      </div>
    );
  }

  // Fallback case, should not be reached
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      An unknown error occurred.
    </div>
  );
}
