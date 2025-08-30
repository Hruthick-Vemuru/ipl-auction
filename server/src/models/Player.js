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
    basePrice: { type: Number, default: 0 },
    soldPrice: { type: Number, default: 0 },
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    status: {
      type: String,
      enum: ["Available", "Sold", "Unsold"],
      default: "Available",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Player", playerSchema);
