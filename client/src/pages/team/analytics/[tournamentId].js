import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { io } from "socket.io-client";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";

// Enhanced Player Card with 3D effects and hover animations
const PlayerCard = memo(function PlayerCard({ player, accentColor, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: -15 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          delay: index * 0.1,
        },
      }}
      whileHover={{
        y: -8,
        scale: 1.02,
        rotateY: 5,
        transition: { type: "spring", stiffness: 400, damping: 10 },
      }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="relative h-28 w-72 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-white/10 hover:border-white/30 transition-all duration-500 group perspective-1000 flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.7) 50%, rgba(30, 30, 30, 0.9) 100%)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500"
        style={{ background: accentColor }}
      />

      <div className="absolute -top-10 left-4 w-28 h-28 transform-gpu">
        <motion.div
          className="relative w-full h-full z-20"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <img
            src={player.image_path}
            alt={player.name}
            className="w-full h-full object-cover rounded-2xl shadow-2xl border-2 border-white/20"
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
      </div>

      <div className="flex flex-col text-right items-end justify-center h-full pl-24">
        <motion.div className="flex items-center gap-3" whileHover={{ x: -5 }}>
          {player.teamLogo && (
            <motion.img
              src={player.teamLogo}
              alt={player.teamName}
              className="w-7 h-7 object-contain rounded-full border border-white/20"
              whileHover={{ scale: 1.2, rotate: 360 }}
              transition={{ duration: 0.5 }}
            />
          )}
          <p className="font-bold text-xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 truncate drop-shadow-lg">
            {player.name}
          </p>
        </motion.div>

        {player.soldPrice > 0 && (
          <motion.p
            className="font-bold text-2xl mt-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text drop-shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: index * 0.1 + 0.2 }}
          >
            {formatCurrency(player.soldPrice)}
          </motion.p>
        )}
      </div>

      {player.nationality !== "Indian" && (
        <motion.div
          className="absolute top-3 right-3 text-2xl"
          title="Overseas Player"
          whileHover={{ scale: 1.3, rotate: 15 }}
          animate={{
            y: [0, -5, 0],
            transition: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          ✈️
        </motion.div>
      )}

      {/* Role badge */}
      <motion.div
        className="absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-semibold bg-black/40 backdrop-blur-sm border border-white/10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 + 0.3 }}
      >
        {player.role}
      </motion.div>
    </motion.div>
  );
});

// Enhanced Chart Components with animations
const AnimatedPieChart = memo(({ data, colors, title, height = 300 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="relative"
  >
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
          fill="#8884d8"
          labelLine={false}
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
          }}
        />
        <Legend
          wrapperStyle={{
            color: "#E2E8F0",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>

    {/* Floating particles background */}
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/10"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 20}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  </motion.div>
));

const AnimatedBarChart = memo(({ data, height = 500 }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.8 }}
  >
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255, 255, 255, 0.1)"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          tickFormatter={(value) => `${value / 10000000} Cr`}
          stroke="#94A3B8"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          stroke="#94A3B8"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
          }}
        />
        <Legend
          wrapperStyle={{
            color: "#E2E8F0",
            fontSize: "12px",
          }}
        />
        <Bar
          dataKey="roleSpend.Batters"
          stackId="a"
          fill="#0088FE"
          name="Batters"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="roleSpend.Allrounders"
          stackId="a"
          fill="#00C49F"
          name="Allrounders"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="roleSpend.Bowlers"
          stackId="a"
          fill="#FFBB28"
          name="Bowlers"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="roleSpend.Wicketkeepers"
          stackId="a"
          fill="#FF8042"
          name="Wicketkeepers"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
));

// Enhanced Tab Component
const TabButton = memo(({ active, onClick, children }) => (
  <motion.button
    onClick={onClick}
    className={`relative px-6 py-3 font-semibold rounded-t-xl transition-all duration-300 ${
      active ? "text-white" : "text-gray-400 hover:text-gray-300"
    }`}
    whileHover={{ y: -2 }}
    whileTap={{ y: 0 }}
  >
    {children}
    {active && (
      <motion.div
        className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
        layoutId="activeTab"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </motion.button>
));

// Enhanced Loading Component
const LoadingSpinner = memo(() => (
  <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p
        className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Loading Analytics...
      </motion.p>
    </motion.div>
  </div>
));

const generateTeamAnalysis = (stats, limits) => {
  if (!stats || !stats.squad || stats.squad.length === 0) {
    return "No players purchased yet. Analysis will be available after the auction.";
  }

  const battingSpend = stats.squad.reduce((sum, p) => {
    if (p.role === "Batter" || p.role === "Wicketkeeper")
      return sum + p.soldPrice;
    if (p.role === "Allrounder") return sum + p.soldPrice * 0.3;
    return sum;
  }, 0);

  const bowlingSpend = stats.squad.reduce((sum, p) => {
    if (p.role === "Bowler") return sum + p.soldPrice;
    if (p.role === "Allrounder") return sum + p.soldPrice * 0.7;
    return sum;
  }, 0);

  const roleAnalysis =
    battingSpend > bowlingSpend
      ? "This is a **batting-heavy** squad, with a majority of funds invested in the batting unit."
      : "This is a **bowling-heavy** squad, with a majority of funds invested in the bowling unit.";

  const overseasPlayers = stats.squad
    .filter((p) => p.nationality === "Overseas")
    .sort((a, b) => b.soldPrice - a.soldPrice);
  const indianPlayers = stats.squad
    .filter((p) => p.nationality === "Indian")
    .sort((a, b) => b.soldPrice - a.soldPrice);

  const comparisonSize = Math.min(
    overseasPlayers.length,
    indianPlayers.length,
    limits.maxOverseasPlayers
  );

  const topOverseasSpend = overseasPlayers
    .slice(0, comparisonSize)
    .reduce((sum, p) => sum + p.soldPrice, 0);
  const topIndianSpend = indianPlayers
    .slice(0, comparisonSize)
    .reduce((sum, p) => sum + p.soldPrice, 0);

  const nationAnalysis =
    topOverseasSpend > topIndianSpend
      ? "The team has invested in an **expensive overseas core**, spending more on its top foreign talent than its top domestic players."
      : "The team has built around a **strong Indian core**, investing more in its top domestic talent than its top foreign players.";

  return `${roleAnalysis} ${nationAnalysis}`;
};

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];
const NATION_COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28"];

export default function AnalyticsPage() {
  const router = useRouter();
  const { tournamentId } = router.query;
  const [tournamentData, setTournamentData] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [activeTab, setActiveTab] = useState("my_team");
  const [isLoading, setIsLoading] = useState(true);

  const refreshAnalytics = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const analytics = await api.submissions.getAnalytics(tournamentId);
      setTournamentData(analytics);
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
    }
  }, [tournamentId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/team/login");
      return;
    }
    if (!tournamentId) return;

    const socket = io(
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
    );

    const initialFetch = async () => {
      try {
        const me = await api.auth.me();
        setMyTeam(me);
        await refreshAnalytics();
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    initialFetch();

    socket.emit("join_tournament", tournamentId);
    socket.on("squad_update", refreshAnalytics);
    socket.on("pools_update", refreshAnalytics);

    return () => socket.disconnect();
  }, [tournamentId, router, refreshAnalytics]);

  const { myTeamAnalytics, allTeamStats, leagueTopBuys } = useMemo(() => {
    if (!tournamentData || !myTeam || !tournamentData.teams) {
      return { myTeamAnalytics: null, allTeamStats: [], leagueTopBuys: {} };
    }

    let allPlayers = [];
    const allStats = tournamentData.teams.map((team) => {
      team.players.forEach((p) =>
        allPlayers.push({
          ...p,
          teamAccent: team.colorAccent,
          teamName: team.name,
          teamLogo: team.logo,
        })
      );
      const totalSpend = team.players.reduce((sum, p) => sum + p.soldPrice, 0);
      const roleSpend = team.players.reduce((acc, p) => {
        const roleName = p.role + "s";
        acc[roleName] = (acc[roleName] || 0) + p.soldPrice;
        return acc;
      }, {});
      const nationSpend = team.players.reduce((acc, p) => {
        acc[p.nationality] = (acc[p.nationality] || 0) + p.soldPrice;
        return acc;
      }, {});
      return {
        name: team.name,
        accent: team.colorAccent,
        totalSpend,
        roleSpend,
        nationSpend,
        squad: team.players,
      };
    });

    const findTopBuysByRole = (role) => {
      return allPlayers
        .filter((p) => p.role === role)
        .sort((a, b) => b.soldPrice - a.soldPrice)
        .slice(0, 5);
    };

    const topBuys = {
      Batters: findTopBuysByRole("Batter"),
      Bowlers: findTopBuysByRole("Bowler"),
      Allrounders: findTopBuysByRole("Allrounder"),
      Wicketkeepers: findTopBuysByRole("Wicketkeeper"),
    };

    const myData = allStats.find((stats) => stats.name === myTeam.name);
    return {
      myTeamAnalytics: myData,
      allTeamStats: allStats,
      leagueTopBuys: topBuys,
    };
  }, [tournamentData, myTeam]);

  const rolePieData = myTeamAnalytics
    ? Object.entries(myTeamAnalytics.roleSpend)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
    : [];
  const nationPieData = myTeamAnalytics
    ? Object.entries(myTeamAnalytics.nationSpend)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  if (isLoading || !myTeam || !tournamentData) {
    return <LoadingSpinner />;
  }

  const bgPrimary = myTeam?.colorPrimary || "#111827";
  const bgAccent = myTeam?.colorAccent || "#D4AF37";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4 md:p-8 text-white overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bgPrimary} 0%, ${bgAccent} 50%, ${bgPrimary} 100%)`,
        backgroundSize: "400% 400%",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.header
          className="flex justify-between items-center mb-8"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent drop-shadow-2xl">
              Live Auction Analysis
            </h1>
            <p className="text-gray-300 mt-2">
              Real-time team performance insights
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/team"
              className="px-6 py-3 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 flex items-center gap-2 group"
            >
              <span>←</span>
              Back to Dashboard
            </Link>
          </motion.div>
        </motion.header>

        {/* Enhanced Tab Navigation */}
        <motion.nav
          className="flex gap-2 mb-8 bg-black/20 backdrop-blur-md rounded-2xl p-2 border border-white/10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <TabButton
            active={activeTab === "my_team"}
            onClick={() => setActiveTab("my_team")}
          >
            🏆 My Team Report
          </TabButton>
          <TabButton
            active={activeTab === "top_buys"}
            onClick={() => setActiveTab("top_buys")}
          >
            ⭐ Top Buys
          </TabButton>
          <TabButton
            active={activeTab === "league_comparison"}
            onClick={() => setActiveTab("league_comparison")}
          >
            📊 League Comparison
          </TabButton>
        </motion.nav>

        <AnimatePresence mode="wait">
          {myTeamAnalytics && myTeamAnalytics.squad.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center bg-black/30 backdrop-blur-xl p-12 rounded-3xl border border-white/10 shadow-2xl"
            >
              <motion.h2
                className="text-4xl font-bold text-yellow-400 mb-4"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Analysis Pending
              </motion.h2>
              <p className="text-gray-400 text-lg">
                Your team has not purchased any players yet.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {activeTab === "my_team" && myTeamAnalytics && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                      className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <h2 className="text-2xl font-semibold mb-6 text-white flex items-center gap-3">
                        <span>🎯</span> Spend by Role
                      </h2>
                      <AnimatedPieChart
                        data={rolePieData}
                        colors={COLORS}
                        height={320}
                      />
                    </motion.div>

                    <motion.div
                      className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                      whileHover={{ y: -5 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        delay: 0.1,
                      }}
                    >
                      <h2 className="text-2xl font-semibold mb-6 text-white flex items-center gap-3">
                        <span>🌍</span> Spend by Nationality
                      </h2>
                      <AnimatedPieChart
                        data={nationPieData}
                        colors={NATION_COLORS}
                        height={320}
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-semibold mb-6 text-white flex items-center gap-3">
                      <span>📈</span> Team Analysis
                    </h2>
                    <motion.p
                      className="text-gray-300 text-lg leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      dangerouslySetInnerHTML={{
                        __html: generateTeamAnalysis(
                          myTeamAnalytics,
                          tournamentData
                        ).replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-yellow-400 font-semibold">$1</strong>'
                        ),
                      }}
                    />
                  </motion.div>
                </div>
              )}

              {activeTab === "top_buys" && (
                <div className="space-y-12">
                  {Object.entries(leagueTopBuys).map(
                    ([role, players]) =>
                      players &&
                      players.length > 0 && (
                        <motion.div
                          key={role}
                          className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6 }}
                        >
                          <h3 className="text-3xl font-bold mb-8 text-center tracking-wider bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            ⭐ Top 5 {role}
                          </h3>
                          <div className="flex flex-wrap gap-6 justify-center">
                            <AnimatePresence>
                              {players.map((p, index) => (
                                <PlayerCard
                                  key={p._id}
                                  player={p}
                                  accentColor={p.teamAccent}
                                  index={index}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )
                  )}
                </div>
              )}

              {activeTab === "league_comparison" && (
                <motion.div
                  className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  <h2 className="text-2xl font-semibold mb-6 text-white flex items-center gap-3">
                    <span>🏆</span> League Spend Comparison by Role
                  </h2>
                  <AnimatedBarChart data={allTeamStats} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
