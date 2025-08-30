/********************************************************************************
 * --- FILE: server/index.js (FINAL - CORRECTED) ---
 ********************************************************************************/
// This is the final version of your server file. The incorrect references to the
// deleted teams.js route have been removed, permanently fixing the crash.

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

// --- DYNAMIC CORS Configuration ---
const productionOrigins = ALLOW_ORIGIN.split(",").map((origin) =>
  origin.trim()
);

const corsOptions = {
  origin: function (origin, callback) {
    const isPrivateNetwork =
      /^(http:\/\/)?(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):\d{4,5}$/.test(
        origin
      );
    if (!origin || productionOrigins.includes(origin) || isPrivateNetwork) {
      return callback(null, true);
    } else {
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
