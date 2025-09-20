/********************************************************************************
 * --- FILE: server/src/routes/cric-data.js (FINAL - LAST 5 YEARS) ---
 ********************************************************************************/
// This version aggregates T20/T20I stats from the last 5 years (2020-onwards).

import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { SPORTMONKS_API_TOKEN } from "../../config.js";
import fetch from "node-fetch";

const r = Router();
const API_BASE = "https://cricket.sportmonks.com/api/v2.0";

const fetchFromApi = async (path) => {
  if (!SPORTMONKS_API_TOKEN) {
    throw new Error(
      "SPORTMONKS_API_TOKEN is not defined in your environment variables. Please add it to your .env file."
    );
  }
  const url = `${API_BASE}${path}${
    path.includes("?") ? "&" : "?"
  }api_token=${SPORTMONKS_API_TOKEN}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("SPORTMONKS API ERROR:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(
        `Failed to fetch data from SportMonks API. Status: ${response.status}`
      );
    }
    return response.json();
  } catch (error) {
    console.error(
      `[CRIC-DATA FETCH ERROR] Failed to fetch from ${url}. Reason:`,
      error
    );
    throw new Error(
      `The server could not connect to the cricket data API. Please check the server's network connection, firewall settings, and ensure your API token is valid.`
    );
  }
};

r.get("/players/search/:name", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const data = await fetchFromApi(
      `/players?filter[lastname]=${req.params.name}`
    );
    res.json(data.data);
  } catch (e) {
    // This will now catch the more descriptive error from fetchFromApi
    console.error("Player search failed:", e);
    res.status(500).json({ error: e.message });
  }
});

r.get("/players/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const response = await fetchFromApi(
      `/players/${req.params.id}?include=career.season,country`
    );
    const playerData = response.data;
    const careerData = Array.isArray(playerData.career)
      ? playerData.career
      : [];

    const finalStats = {};
    const fiveYearsAgo = new Date().getFullYear() - 5; // Get the cutoff year (e.g., 2020)

    // --- NEW: Filter career data for the last 5 years ---
    const recentCareerData = careerData.filter((c) => {
      // The season name is often the year, so we parse it
      const seasonYear = parseInt(c.season?.name, 10);
      return seasonYear >= fiveYearsAgo;
    });

    const formatsToProcess = ["T20I", "T20"];
    formatsToProcess.forEach((format) => {
      const formatEntries = recentCareerData.filter((c) => c.type === format);

      if (formatEntries.length > 0) {
        const aggregated = formatEntries.reduce(
          (acc, entry) => {
            if (entry.batting) {
              acc.batting.runs += entry.batting.runs_scored || 0;
              acc.batting.balls += entry.batting.balls_faced || 0;
              acc.batting.hundreds += entry.batting.hundreds || 0;
              acc.batting.fifties += entry.batting.fifties || 0;
              if (
                (entry.batting.highest_inning_score || 0) >
                acc.batting.highest_score
              ) {
                acc.batting.highest_score = entry.batting.highest_inning_score;
              }
            }
            if (entry.bowling) {
              acc.bowling.wickets += entry.bowling.wickets || 0;
              acc.bowling.runs_conceded += entry.bowling.runs || 0;
              acc.bowling.balls_bowled +=
                Math.floor(entry.bowling.overs || 0) * 6 +
                ((entry.bowling.overs || 0) % 1) * 10;
            }
            return acc;
          },
          {
            batting: {
              runs: 0,
              balls: 0,
              hundreds: 0,
              fifties: 0,
              highest_score: 0,
            },
            bowling: { wickets: 0, runs_conceded: 0, balls_bowled: 0 },
          }
        );

        const finalBatting = {
          ...aggregated.batting,
          strike_rate:
            aggregated.batting.balls > 0
              ? (
                  (aggregated.batting.runs / aggregated.batting.balls) *
                  100
                ).toFixed(2)
              : "0.00",
        };
        const finalBowling = {
          ...aggregated.bowling,
          average:
            aggregated.bowling.wickets > 0
              ? (
                  aggregated.bowling.runs_conceded / aggregated.bowling.wickets
                ).toFixed(2)
              : "0.00",
          strike_rate:
            aggregated.bowling.wickets > 0
              ? (
                  aggregated.bowling.balls_bowled / aggregated.bowling.wickets
                ).toFixed(2)
              : "0.00",
        };

        finalStats[format] = {
          batting: finalBatting,
          bowling: finalBowling,
        };
      }
    });

    const transformedData = {
      ...playerData,
      battingstyle: playerData.battingstyle,
      career: undefined,
      stats: finalStats,
    };

    res.json(transformedData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
