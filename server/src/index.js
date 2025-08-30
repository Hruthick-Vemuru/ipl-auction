/********************************************************************************
 * --- FILE: server/index.js (FINAL - PRODUCTION SECURE) ---
 ********************************************************************************/
// This is the final version of your server file. The CORS configuration has been
// updated to be stricter for production, removing the automatic allowance for
// local network IPs (WLAN). It now ONLY allows URLs specified in your
// ALLOW_ORIGIN environment variable.

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import { PORT, MONGO_URI, ALLOW_ORIGIN } from "../config.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket.js";

import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import playerRoutes from "./routes/players.js";
import auctionRoutes from "./routes/auction.js";
import submissionRoutes from "./routes/submissions.js";
// The `teamRoutes` import has been correctly removed
import poolRoutes from "./routes/pools.js";

const app = express();
const httpServer = createServer(app);

// --- PRODUCTION-SECURE CORS Configuration ---
// This reads the ALLOW_ORIGIN variable from your environment (e.g., on Render)
// and splits it into an array of approved URLs.
const allowedOrigins = ALLOW_ORIGIN.split(",").map((origin) => origin.trim());

const corsOptions = {
  // The origin function checks if an incoming request's origin is on our guest list
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., from tools like Postman)
    if (!origin) return callback(null, true);

    // If the origin is in our explicitly allowed list, allow it.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      // Otherwise, reject it
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// --- Socket.IO Server Setup ---
const io = new Server(httpServer, { cors: corsOptions });
setupSocket(io);
app.set("io", io);

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

// --- API Routes ---
app.get("/", (req, res) =>
  res.json({ ok: true, service: "mini-ipl-auction-v2" })
);
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/submissions", submissionRoutes);
// The `app.use('/api/teams', ...)` line has been correctly removed
app.use("/api/pools", poolRoutes);

// --- Database and Server Start ---
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Mongo connected");
    httpServer.listen(PORT, () => console.log("Server running on", PORT));
  })
  .catch((err) => {
    console.error("Mongo error", err);
    process.exit(1);
  });
