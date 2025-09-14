import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    passwordHash: { type: String },
    isVerified: { type: Boolean, default: false },
    // --- UPDATED FIELDS FOR OTP VERIFICATION ---
    otp: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
