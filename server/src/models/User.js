import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    // passwordHash is no longer required
    passwordHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
