import express from "express";
import session from "express-session";
import passport from "passport";
// --- THIS IS THE CORRECTED IMPORT PATH ---
import "./passport-setup.js";
import { SESSION_SECRET, MONGO_URI, PORT, ALLOW_ORIGIN } from "../config.js";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket.js";

import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import playerRoutes from "./routes/players.js";
import auctionRoutes from "./routes/auction.js";
import submissionRoutes from "./routes/submissions.js";
import poolRoutes from "./routes/pools.js";

const app = express();
const httpServer = createServer(app);

const productionOrigins = ALLOW_ORIGIN.split(",").map((origin) =>
  origin.trim()
);
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || productionOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const io = new Server(httpServer, { cors: corsOptions });
setupSocket(io);
app.set("io", io);

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- API Routes ---
app.get("/", (req, res) =>
  res.json({ ok: true, service: "mini-ipl-auction-v2" })
);
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/submissions", submissionRoutes);
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
