import React, { useState, useEffect, useMemo, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// Redesigned PlayerCard with a professional hexagon shape
const PlayerCard = memo(function PlayerCard({ player, accentColor }) {
  return (
    <div
      className="relative w-full h-28 flex items-center justify-center transition-transform hover:scale-110 group"
      style={{
        clipPath:
          "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)",
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm group-hover:bg-black/70 transition-colors border"
        style={{
          clipPath:
            "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)",
          borderColor: accentColor,
        }}
      ></div>
      <div className="relative z-10 text-center p-2 w-full">
        {player.nationality === "Overseas" && (
          <div
            className="absolute top-2 right-6 text-xl"
            title="Overseas Player"
          >
            ✈️
          </div>
        )}
        <div
          className="font-bold text-lg leading-tight truncate"
          style={{ color: accentColor }}
        >
          {player.name}
        </div>
        <div className="text-green-400 font-semibold text-sm mt-1">
          {formatCurrency(player.soldPrice)}
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate">
          {player.teamName}
        </div>
      </div>
    </div>
  );
});

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function PublicAnalyticsPage() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournamentData, setTournamentData] = useState(null);
  const [activeTab, setActiveTab] = useState("top_buys");
  const [isLoading, setIsLoading] = useState(true);

  // Default theme for the viewer mode
  const VIEWER_THEME = { primary: "#111827", accent: "#D4AF37" }; // Black & Gold

  useEffect(() => {
    if (tournamentId) {
      api.tournaments
        .getPublicAnalytics(tournamentId)
        .then(setTournamentData)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [tournamentId]);

  const { allTeamStats, leagueTopBuys } = useMemo(() => {
    if (
      !tournamentData ||
      !tournamentData.teams ||
      tournamentData.teams.length === 0
    ) {
      return { allTeamStats: [], leagueTopBuys: {} };
    }

    let allPlayers = [];
    const allStats = tournamentData.teams.map((team) => {
      team.players.forEach((p) => {
        allPlayers.push({
          ...p,
          teamAccent: team.colorAccent,
          teamName: team.name,
        });
      });
      const roleSpend = team.players.reduce((acc, p) => {
        const roleName = p.role + "s";
        acc[roleName] = (acc[roleName] || 0) + p.soldPrice;
        return acc;
      }, {});
      return { name: team.name, roleSpend };
    });

    const findTopBuys = (role) => {
      return allPlayers
        .filter((p) => p.role === role)
        .sort((a, b) => b.soldPrice - a.soldPrice)
        .slice(0, 10);
    };

    const topBuys = {
      Batters: findTopBuys("Batter"),
      Bowlers: findTopBuys("Bowler"),
      Allrounders: findTopBuys("Allrounder"),
      Wicketkeepers: findTopBuys("Wicketkeeper"),
    };

    return { allTeamStats: allStats, leagueTopBuys: topBuys };
  }, [tournamentData]);

  if (isLoading || !tournamentData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading Analytics...
      </div>
    );
  }

  const bgPrimary = VIEWER_THEME.primary;
  const bgAccent = VIEWER_THEME.accent;

  return (
    <div
      className="min-h-screen p-4 md:p-8 text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), linear-gradient(45deg, ${bgPrimary}, ${bgAccent})`,
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold" style={{ color: bgAccent }}>
            {tournamentData.title} - Analytics
          </h1>
          <Link
            href={`/viewer/${tournamentId}`}
            className="text-blue-400 hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </header>

        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("top_buys")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "top_buys"
                ? "border-b-2 text-white border-white"
                : "text-gray-400"
            }`}
          >
            Top 10 Buys
          </button>
          <button
            onClick={() => setActiveTab("league_comparison")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "league_comparison"
                ? "border-b-2 text-white border-white"
                : "text-gray-400"
            }`}
          >
            League Comparison
          </button>
        </div>

        {activeTab === "top_buys" && (
          <div className="space-y-10">
            {Object.entries(leagueTopBuys).map(
              ([role, players]) =>
                players &&
                players.length > 0 && (
                  <div
                    key={role}
                    className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10"
                  >
                    <h3
                      className="text-3xl font-bold mb-6 text-center tracking-wider"
                      style={{ color: bgAccent }}
                    >
                      Top 10 {role}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {players.map((p) => (
                        <PlayerCard
                          key={p._id}
                          player={p}
                          accentColor={p.teamAccent}
                        />
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}

        {activeTab === "league_comparison" && (
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
            <h2 className="text-2xl font-semibold mb-4 text-white">
              League Spend Comparison by Role
            </h2>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={allTeamStats}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.1)"
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `${value / 10000000} Cr`}
                  stroke="#A0AEC0"
                  tick={{ fill: "#A0AEC0" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke="#A0AEC0"
                  tick={{ fill: "#A0AEC0" }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  contentStyle={{
                    backgroundColor: "rgba(30, 41, 59, 0.9)",
                    border: "1px solid #4A5568",
                  }}
                  itemStyle={{ color: "#E2E8F0" }}
                  labelStyle={{ color: "#CBD5E0" }}
                />
                <Legend wrapperStyle={{ color: "#E2E8F0" }} />
                <Bar
                  dataKey="roleSpend.Batters"
                  stackId="a"
                  fill={COLORS[0]}
                  name="Batters"
                />
                <Bar
                  dataKey="roleSpend.Allrounders"
                  stackId="a"
                  fill={COLORS[1]}
                  name="Allrounders"
                />
                <Bar
                  dataKey="roleSpend.Bowlers"
                  stackId="a"
                  fill={COLORS[2]}
                  name="Bowlers"
                />
                <Bar
                  dataKey="roleSpend.Wicketkeepers"
                  stackId="a"
                  fill={COLORS[3]}
                  name="Wicketkeepers"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
