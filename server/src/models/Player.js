/********************************************************************************
 * --- FILE: server/src/models/Player.js (FINAL) ---
 ********************************************************************************/
import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["Batter", "Bowler", "Allrounder", "Wicketkeeper"],
      required: true,
    },
    nationality: { type: String, required: true },
    basePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Available", "Sold", "Unsold"],
      default: "Available",
    },
    soldPrice: { type: Number, default: 0 },
    soldTo: { type: mongoose.Schema.Types.ObjectId },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image_path: { type: String },
    battingstyle: { type: String },
    // --- The stats field is essential for storing our aggregated data ---
    stats: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

playerSchema.index({ name: 1, admin: 1 }, { unique: true });

export default mongoose.model("Player", playerSchema);
