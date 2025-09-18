import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            background:
              i % 3 === 0
                ? "rgba(99, 102, 241, 0.4)"
                : i % 3 === 1
                ? "rgba(139, 92, 246, 0.4)"
                : "rgba(168, 85, 247, 0.4)",
          }}
          animate={{
            y: [0, Math.random() * 30 - 15, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: Math.random() * 8 + 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
};

// Animated background streaks
const BackgroundStreaks = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            top: `${20 + i * 25}%`,
            left: `${i * 30}%`,
          }}
          animate={{
            y: [0, 20, 0],
            x: [0, 15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12 + i * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={i + 3}
          className="absolute h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{
            background: "linear-gradient(135deg, #6366F1, #4F46E5)",
            top: `${15 + i * 30}%`,
            right: `${i * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// SVG Icon for the header
const ViewerIcon = () => (
  <motion.svg
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
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </motion.svg>
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background elements */}
      <BackgroundStreaks />
      <FloatingParticles />

      <motion.div
        className="bg-gray-800 bg-opacity-70 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative elements */}
        <div className="absolute -top-14 left-1/2 transform -translate-x-1/2">
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          >
            <ViewerIcon />
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="pt-12"
        >
          <motion.h1
            className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500 tracking-tight"
            variants={itemVariants}
          >
            Auction Spectator
          </motion.h1>
          <motion.p className="text-gray-300 mb-8" variants={itemVariants}>
            Enter a tournament code to view live analytics and progress.
          </motion.p>

          {msg && (
            <motion.div
              className="text-center p-3 rounded-lg mb-4 bg-red-900 bg-opacity-50 text-red-200 border border-red-700 backdrop-blur-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {msg}
            </motion.div>
          )}

          <motion.form
            onSubmit={submit}
            className="text-left"
            variants={itemVariants}
          >
            <div className="relative">
              <input
                placeholder="TOURNAMENT CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full p-4 bg-gray-700 bg-opacity-50 border-2 border-gray-600 rounded-lg tracking-widest text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm uppercase transition-all duration-300"
                disabled={isLoading}
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 rounded-lg text-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Connecting...</span>
                </>
              ) : (
                "View Auction"
              )}
            </motion.button>
          </motion.form>

          <motion.div className="mt-8" variants={itemVariants}>
            <Link
              href="/"
              className="text-indigo-400 hover:text-indigo-300 transition-colors duration-300 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
