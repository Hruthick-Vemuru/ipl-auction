import dotenv from "dotenv";
dotenv.config();
export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const INITIAL_PURSE = Number(process.env.INITIAL_PURSE || 100000000);
export const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "http://localhost:5173";
