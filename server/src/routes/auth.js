import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Tournament from "../models/Tournament.js";
import Submission from "../models/Submission.js";
import {
  JWT_SECRET,
  CLIENT_URL,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
} from "../../config.js";
import { auth } from "../middleware/auth.js";
import passport from "passport";
import validator from "email-validator";
import "../passport-setup.js";

const r = Router();

// --- Nodemailer Transport Setup (using .env variables) ---
let transporter;
if (EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

// Step 1: Request Registration & Send OTP
r.post("/register/send-otp", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }
  if (!validator.validate(email)) {
    return res
      .status(400)
      .json({ error: "Please enter a valid email address." });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.isVerified) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, otp, otpExpires, isVerified: false },
    { upsert: true, new: true }
  );

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"IPL Auction Admin" <${EMAIL_USER}>`,
        to: email,
        subject: "Your IPL Auction Verification Code",
        text: `Your verification code is: ${otp}`,
        html: `<b>Your verification code is: ${otp}</b><p>It will expire in 10 minutes.</p>`,
      });
      return res
        .status(200)
        .json({ message: "An OTP has been sent to your email address." });
    } catch (emailError) {
      console.error(
        "Failed to send OTP email via configured SMTP:",
        emailError
      );
      return res
        .status(500)
        .json({
          error:
            "Could not send verification email due to a server configuration issue.",
        });
    }
  } else {
    // Fallback if SMTP is not configured in .env
    console.log("-----------------------------------------");
    console.log("SMTP NOT CONFIGURED. OTP for " + email + ": " + otp);
    console.log("-----------------------------------------");
    return res
      .status(200)
      .json({ message: "An OTP has been generated (check server console)." });
  }
});

// Step 2: Verify OTP and Finalize Registration
r.post("/register/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required." });
  }

  const user = await User.findOne({
    email,
    otp,
    otpExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired OTP." });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.status(201).json({ token, role: "admin", adminId: user._id });
});

// Admin login
r.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  if (!user.passwordHash) {
    return res
      .status(401)
      .json({ error: "This account must sign in with Google." });
  }

  if (!user.isVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email address before logging in." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token, role: "admin", adminId: user._id, email: user.email });
});

// Team login
r.post("/team-login", async (req, res) => {
  const { tournamentCode, username, password } = req.body;
  const tournament = await Tournament.findOne({
    code: tournamentCode.toUpperCase(),
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
  if (!ok) return res.status(401).json({ error: "Invalid credentials." });

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

// Get logged-in team's own data - REWRITTEN FOR STABILITY
r.get("/me/team", auth, async (req, res) => {
  if (req.user.role !== "team") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { tournamentId, teamId } = req.user;

    const tournament = await Tournament.findById(tournamentId).populate({
      path: "teams",
      populate: {
        path: "players",
        model: "Player",
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const teamSubDoc = tournament.teams.id(teamId);
    if (!teamSubDoc) {
      return res
        .status(404)
        .json({
          error: "Team not found in this tournament. Please log in again.",
        });
    }

    const submission = await Submission.findOne({ team: teamId }).populate(
      "squad playingXI captain viceCaptain"
    );

    const teamObject = teamSubDoc.toObject();
    teamObject.tournament = tournament._id;
    teamObject.submission = submission;

    res.json(teamObject);
  } catch (e) {
    console.error("Error fetching team 'me' data:", e);
    res.status(500).json({ error: "Server error while fetching team data." });
  }
});

// Get logged-in admin's data
r.get("/me/admin", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "Admin user not found" });
    res.json(user);
  } catch (e) {
    console.error("Error fetching admin 'me':", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Admin Impersonate Team Route ---
r.post("/impersonate/:teamId", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const { teamId } = req.params;
    // Find any tournament that contains this teamId
    const tournament = await Tournament.findOne({ "teams._id": teamId });
    if (!tournament) {
      return res
        .status(404)
        .json({ error: "Team not found in any tournament." });
    }

    // Security check: ensure the admin owns the tournament the team is in
    if (String(tournament.admin) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ error: "You do not own the tournament this team belongs to." });
    }

    // Create a temporary, short-lived token for the team
    const teamToken = jwt.sign(
      { role: "team", teamId: teamId, tournamentId: tournament._id },
      JWT_SECRET,
      { expiresIn: "1h" } // Impersonation token is valid for 1 hour
    );
    res.json({ token: teamToken });
  } catch (e) {
    console.error("Impersonation error:", e);
    res.status(500).json({ error: "Server error during impersonation." });
  }
});

// Google OAuth routes
r.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

r.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/admin/login",
  }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id, role: "admin" }, JWT_SECRET, {
      expiresIn: "12h",
    });
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
  }
);

export default r;
