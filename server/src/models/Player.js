import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["Batter", "Bowler", "Allrounder", "Wicketkeeper"],
      required: true,
    },
    nationality: { type: String, enum: ["Indian", "Overseas"], required: true },
    basePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Available", "Sold", "Unsold"],
      default: "Available",
    },
    soldPrice: { type: Number, default: 0 },
    soldTo: { type: mongoose.Schema.Types.ObjectId }, // Correctly has no ref
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// --- THIS IS THE FIX ---
// This compound index ensures player names are unique PER ADMIN, not globally.
playerSchema.index({ name: 1, admin: 1 }, { unique: true });

export default mongoose.model("Player", playerSchema);
