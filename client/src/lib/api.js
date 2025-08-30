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
    login: (email, password) =>
      req("/api/auth/login", "POST", { email, password }),
    teamLogin: (tournamentCode, username, password) =>
      req("/api/auth/team-login", "POST", {
        tournamentCode,
        username,
        password,
      }),
    seedAdmin: (email, password, name) =>
      req("/api/auth/seed-admin", "POST", { email, password, name }),
  },
  tournaments: {
    create: (payload) => req("/api/tournaments", "POST", payload),
    my: () => req("/api/tournaments/my"),
    getById: (id) => req("/api/tournaments/" + id),
    getTeams: (tournamentId) => req(`/api/tournaments/${tournamentId}/teams`),
    createTeam: (tournamentId, teamData) =>
      req(`/api/tournaments/${tournamentId}/teams`, "POST", teamData),
    deleteTeam: (tournamentId, teamId) =>
      req(`/api/tournaments/${tournamentId}/teams/${teamId}`, "DELETE"),
    delete: (tournamentId) => req(`/api/tournaments/${tournamentId}`, "DELETE"),
  },

  // --- The `teams` object now only contains the corrected `me` function ---
  teams: {
    // --- THIS FUNCTION HAS BEEN CORRECTED ---
    me: () => req("/api/auth/me/team"),
  },

  players: {
    list: (q = "") => req("/api/players" + q),
    create: (p) => req("/api/players", "POST", p),
    getUnassigned: (tournamentId) =>
      req(`/api/players/unassigned/${tournamentId}`),
    delete: (playerId) => req(`/api/players/${playerId}`, "DELETE"),
  },
  pools: {
    list: (tournamentId) => req(`/api/pools/tournament/${tournamentId}`),
    create: (poolData) => req("/api/pools", "POST", poolData),
    update: (poolId, poolData) => req(`/api/pools/${poolId}`, "PUT", poolData),
    delete: (poolId) => req(`/api/pools/${poolId}`, "DELETE"),
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
};
