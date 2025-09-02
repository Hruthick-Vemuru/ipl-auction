import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";
import "./passport-setup.js"; // Note: Corrected path from previous fixes
import { PORT, MONGO_URI, ALLOW_ORIGIN, SESSION_SECRET } from "../config.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket.js";

import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import playerRoutes from "./routes/players.js";
import auctionRoutes from "./routes/auction.js";
import submissionRoutes from "./routes/submissions.js";
// The `teamRoutes` and `poolRoutes` are correctly removed from here in the embedded architecture

const app = express();
const httpServer = createServer(app);

// --- CORS Configuration ---
const allowedOrigins = ALLOW_ORIGIN.split(",").map((origin) => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // This logic allows requests from any URL in your ALLOW_ORIGIN list.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`The origin ${origin} is not allowed by CORS`));
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
