/********************************************************************************
 * --- FILE: server/config.js (CORRECTED) ---
 ********************************************************************************/
// This is the complete and final version of your config file.
// It has been updated to correctly export the SERVER_URL variable, which will
// permanently fix the server crash.

import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const INITIAL_PURSE = Number(process.env.INITIAL_PURSE || 100000000);
export const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "http://localhost:3000";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const SESSION_SECRET =
  process.env.SESSION_SECRET || "a-very-long-random-string-for-sessions";

// --- THIS IS THE NEW, CRITICAL EXPORT LINE ---
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
