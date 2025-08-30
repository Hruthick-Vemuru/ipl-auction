import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      unique: true,
    },
    squad: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    playingXI: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    viceCaptain: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    locked: { type: Boolean, default: false },
    grade: { type: String }, // The admin's grade is saved here
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
