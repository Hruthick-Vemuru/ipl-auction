import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "@/lib/api";

// SVG Icon for the header
const ViewerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-indigo-400 mb-4 mx-auto"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// SVG Spinner for the button's loading state
const LoadingSpinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export default function ViewerLoginPage() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    if (!code) return;
    setMsg("");
    setIsLoading(true);
    try {
      const tournament = await api.tournaments.getPublicTournamentByCode(code);
      router.push(`/viewer/${tournament._id}`);
    } catch (err) {
      setMsg(err.message || "Tournament not found or is not active.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center bg-gray-900 text-white p-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1599551433433-c70f0b4d4b8e?q=80&w=2070&auto=format&fit=crop')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/70"></div>
      <form
        onSubmit={submit}
        className="relative z-10 bg-black/40 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-md text-center border border-white/10"
      >
        <ViewerIcon />
        <h1 className="text-4xl font-bold mb-2 text-indigo-400 tracking-tight">
          Auction Spectator
        </h1>
        <p className="text-gray-300 mb-8">
          Enter a tournament code to view live analytics and progress.
        </p>

        {msg && (
          <div className="text-center p-3 rounded-lg mb-4 bg-red-800 text-red-200 border border-red-600">
            {msg}
          </div>
        )}

        <div className="relative">
          <input
            placeholder="TOURNAMENT CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            className="w-full p-4 bg-gray-700/50 border-2 border-gray-600 rounded-lg tracking-widest text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 py-3 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? <LoadingSpinner /> : "View Auction"}
        </button>
        <div className="mt-8">
          <Link href="/" className="text-blue-400 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </form>
    </div>
  );
}
