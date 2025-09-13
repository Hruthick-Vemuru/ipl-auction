import mongoose from "mongoose";

// This is a SUB-DOCUMENT schema for Teams.
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  colorPrimary: { type: String },
  colorAccent: { type: String },
  purseRemaining: { type: Number, default: 0 },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
});

// --- NEW: This is a SUB-DOCUMENT schema for Pools ---
const poolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  order: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
});

// This is the main Tournament schema
const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    teams: [teamSchema],
    pools: [poolSchema], // The pools array will store pool sub-documents
    maxSquadSize: { type: Number, default: 18 },
    maxOverseasPlayers: { type: Number, default: 6 },
  },

  { timestamps: true }
);

tournamentSchema.index({ admin: 1, title: 1 }, { unique: true });

export default mongoose.model("Tournament", tournamentSchema);
