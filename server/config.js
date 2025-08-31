import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const INITIAL_PURSE = Number(process.env.INITIAL_PURSE || 100000000);
export const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "http://localhost:3000";

// --- THESE ARE THE NEW, CRITICAL EXPORT LINES ---
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const SESSION_SECRET =
  process.env.SESSION_SECRET || "a-very-long-random-string-for-sessions";
