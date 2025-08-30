import mongoose from "mongoose";

const poolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    order: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

poolSchema.index({ tournament: 1, name: 1 }, { unique: true });

export default mongoose.model("Pool", poolSchema);
