const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
let token = null;

export function setToken(t) {
  token = t;
  if (typeof window !== "undefined") {
    localStorage.setItem("token", t || "");
  }
}

export function getToken() {
  if (token) return token;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
    return token;
  }
  return null;
}

async function req(path, method = "GET", body) {
  const currentToken = getToken();
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: "Bearer " + currentToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(
      (await res.json()).error || "Request failed with status " + res.status
    );

  if (res.status === 204) {
    return;
  }
  return res.json();
}

export const api = {
  auth: {
    sendAdminOtp: (name, email, password) =>
      req("/api/auth/register/send-otp", "POST", { name, email, password }),
    verifyAdminOtp: (email, otp) =>
      req("/api/auth/register/verify-otp", "POST", { email, otp }),
    adminLogin: (email, password) =>
      req("/api/auth/login", "POST", { email, password }),
    teamLogin: (tournamentCode, username, password) =>
      req("/api/auth/team-login", "POST", {
        tournamentCode,
        username,
        password,
      }),
    me: () => req("/api/auth/me/team"),
    meAdmin: () => req("/api/auth/me/admin"),
    impersonateTeam: (teamId) => req(`/api/auth/impersonate/${teamId}`, "POST"),
  },
  tournaments: {
    getPublicTournamentByCode: (code) =>
      req(`/api/tournaments/public/code/${code}`),
    getPublicPools: (tournamentId) =>
      req(`/api/tournaments/public/${tournamentId}/pools`),
    getPublicAnalytics: (tournamentId) =>
      req(`/api/tournaments/public/analytics/${tournamentId}`),
    create: (payload) => req("/api/tournaments", "POST", payload),
    my: () => req("/api/tournaments/my"),
    getById: (id) => req("/api/tournaments/" + id),
    getTeams: (tournamentId) => req(`/api/tournaments/${tournamentId}/teams`),
    createTeam: (tournamentId, teamData) =>
      req(`/api/tournaments/${tournamentId}/teams`, "POST", teamData),
    updateTeam: (tournamentId, teamId, teamData) =>
      req(`/api/tournaments/${tournamentId}/teams/${teamId}`, "PUT", teamData),
    deleteTeam: (tournamentId, teamId) =>
      req(`/api/tournaments/${tournamentId}/teams/${teamId}`, "DELETE"),
    delete: (tournamentId) => req(`/api/tournaments/${tournamentId}`, "DELETE"),
    listPools: (tournamentId) => req(`/api/tournaments/${tournamentId}/pools`),
    createPool: (tournamentId, poolData) =>
      req(`/api/tournaments/${tournamentId}/pools`, "POST", poolData),
    updatePool: (tournamentId, poolId, poolData) =>
      req(`/api/tournaments/${tournamentId}/pools/${poolId}`, "PUT", poolData),
    deletePool: (tournamentId, poolId) =>
      req(`/api/tournaments/${tournamentId}/pools/${poolId}`, "DELETE"),
    // --- NEW FUNCTION TO FIX BUG ---
    removePlayerFromPool: (tournamentId, poolId, playerId) =>
      req(
        `/api/tournaments/${tournamentId}/pools/${poolId}/players/${playerId}`,
        "DELETE"
      ),
  },
  players: {
    list: (q = "") => req("/api/players" + q),
    create: (p) => req("/api/players", "POST", p),
    getUnassigned: (tournamentId) =>
      req(`/api/players/unassigned/${tournamentId}`),
    delete: (playerId) => req(`/api/players/${playerId}`, "DELETE"),
  },
  auction: {
    startPool: (tournamentId, poolId) =>
      req("/api/auction/start-pool", "POST", { tournamentId, poolId }),
    sellPlayer: (tournamentId, playerId, teamId, price) =>
      req("/api/auction/sell", "POST", {
        tournamentId,
        playerId,
        teamId,
        price,
      }),
    unsoldPlayer: (tournamentId, playerId) =>
      req("/api/auction/unsold", "POST", { tournamentId, playerId }),
  },
  submissions: {
    submit: (payload) => req("/api/submissions/submit", "POST", payload),
    getByTournament: (tournamentId) =>
      req(`/api/submissions/tournament/${tournamentId}`),
    lock: (teamId, locked) =>
      req("/api/submissions/lock", "POST", { teamId, locked }),
    grade: (teamId, grade) =>
      req("/api/submissions/grade", "POST", { teamId, grade }),
    getAnalytics: (tournamentId) =>
      req(`/api/submissions/analytics/${tournamentId}`),
  },
  cricData: {
    searchPlayers: (name) => req(`/api/cric-data/players/search/${name}`),
    getPlayerDetails: (id) => req(`/api/cric-data/players/${id}`),
  },
};
