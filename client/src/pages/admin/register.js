import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function AdminRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 for details, 2 for OTP

  const router = useRouter();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.sendAdminOtp(name, email, password);
      setMsg(res.message);
      setStep(2); // Move to OTP verification step
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.verifyAdminOtp(email, otp);
      setToken(res.token);
      router.push("/admin"); // Success! Redirect to dashboard.
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid place-items-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center">
        {step === 1 ? (
          <>
            <h2 className="text-3xl font-bold mb-2 text-blue-400">
              Create Admin Account
            </h2>
            <p className="text-gray-400 mb-8">Step 1: Enter your details</p>
            <form onSubmit={handleSendOtp} className="space-y-4 text-left">
              {error && (
                <div className="text-center p-3 rounded-lg bg-red-800 text-red-200 border border-red-600">
                  {error}
                </div>
              )}
              <input
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              />
              <input
                placeholder="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
              >
                {isLoading ? "Sending OTP..." : "Send Verification Code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-blue-400">
              Verify Your Email
            </h2>
            <p className="text-gray-400 mb-8">
              Step 2: Enter the code we sent to your email
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
              {msg && (
                <div className="text-center p-3 rounded-lg bg-green-800 text-green-200 border border-green-600">
                  {msg}
                </div>
              )}
              {error && (
                <div className="text-center p-3 rounded-lg bg-red-800 text-red-200 border border-red-600">
                  {error}
                </div>
              )}
              <input
                placeholder="6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-center tracking-[0.5em] text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
              >
                {isLoading ? "Verifying..." : "Create Account"}
              </button>
            </form>
          </>
        )}
        <div className="mt-6 text-center text-sm">
          <Link href="/admin/login" className="text-gray-400 hover:underline">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
