import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Tournament from "../models/Tournament.js";
import { JWT_SECRET } from "../../config.js";
import { auth } from "../middleware/auth.js";
import Submission from "../models/Submission.js";
import passport from "passport";
import "../passport-setup.js"; // Ensure passport strategies are set up

const r = Router();

// Create the first admin user
r.post("/seed-admin", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  // Check if any admin user already exists
  const adminCount = await User.countDocuments();
  if (adminCount > 0) {
    return res.status(403).json({
      error: "An admin account already exists. Seeding is only allowed once.",
    });
  }

  const ph = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash: ph, name });
  res.status(201).json({ ok: true, userId: user._id });
});

// Admin login
r.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token, role: "admin", adminId: user._id, email: user.email });
});

// Team login
r.post("/team-login", async (req, res) => {
  const { tournamentCode, username, password } = req.body;
  const tournament = await Tournament.findOne({
    code: tournamentCode,
    active: true,
  });
  if (!tournament)
    return res
      .status(404)
      .json({ error: "Tournament not found or is not active." });

  const team = tournament.teams.find((t) => t.username === username);
  if (!team)
    return res
      .status(404)
      .json({ error: "Team not found in this tournament." });

  const ok = await bcrypt.compare(password, team.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { role: "team", teamId: team._id, tournamentId: tournament._id },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
  res.json({
    token,
    role: "team",
    teamId: team._id,
    tournamentId: tournament._id,
    teamName: team.name,
  });
});

// Get logged-in team's own data
r.get("/me/team", auth, async (req, res) => {
  if (req.user.role !== "team")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const { tournamentId, teamId } = req.user;

    const tournament = await Tournament.findById(tournamentId).populate(
      "teams.players"
    );
    if (!tournament)
      return res.status(404).json({ error: "Tournament not found" });

    const teamSubDoc = tournament.teams.id(teamId);
    if (!teamSubDoc) return res.status(404).json({ error: "Team not found" });

    // --- NEW LOGIC ---
    // After finding the team, find their corresponding submission document.
    const submission = await Submission.findOne({ team: teamId }).populate(
      "squad playingXI captain viceCaptain"
    );

    const teamObject = teamSubDoc.toObject();
    teamObject.tournament = tournament._id;
    // Attach the submission to the data object before sending it.
    teamObject.submission = submission;

    res.json(teamObject);
  } catch (e) {
    console.error("Error fetching team 'me':", e);
    res.status(500).json({ error: "Server error" });
  }
});

r.get("/google", passport.authenticate("google"));

// This is the route Google redirects to after a successful login
r.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login/failed",
  }),
  (req, res) => {
    // If login is successful, the user object is attached to req.user by Passport
    const user = req.user;
    const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, {
      expiresIn: "12h",
    });

    // Redirect the user back to the frontend with the token
    res.redirect(
      `${
        process.env.CLIENT_URL || "http://localhost:3000"
      }/auth/callback?token=${token}`
    );
  }
);

export default r;
