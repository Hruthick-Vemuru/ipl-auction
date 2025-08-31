import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  colorPrimary: { type: String },
  colorAccent: { type: String },
  purseRemaining: { type: Number, default: 0 },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
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
    // The teams array will store team sub-documents based on the schema above
    teams: [teamSchema],
  },
  { timestamps: true }
);

// The uniqueness rule for a tournament title remains per admin.
tournamentSchema.index({ admin: 1, title: 1 }, { unique: true });

export default mongoose.model("Tournament", tournamentSchema);
