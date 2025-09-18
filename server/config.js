// In server/config.js

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

export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// --- EMAIL SERVER (SMTP) EXPORTS ---
export const EMAIL_HOST = process.env.EMAIL_HOST;
export const EMAIL_PORT = process.env.EMAIL_PORT;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;

// --- NEW: SPORTMONKS API TOKEN ---
export const SPORTMONKS_API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
