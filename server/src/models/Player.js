import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    // --- THIS IS THE NEW, CRITICAL FIELD ---
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["Batter", "Bowler", "Allrounder", "Wicketkeeper"],
      required: true,
    },
    nationality: { type: String, enum: ["Indian", "Overseas"], required: true },
    basePrice: { type: Number, default: 0 },
    soldPrice: { type: Number, default: 0 },
    soldTo: { type: mongoose.Schema.Types.ObjectId, default: null }, // Note: This ref would ideally point to the sub-document, but for simplicity we leave it as is.
    status: {
      type: String,
      enum: ["Available", "Sold", "Unsold"],
      default: "Available",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Player", playerSchema);
