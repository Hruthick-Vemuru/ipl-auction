// In client/src/pages/team/login.js

import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, setToken } from "../../lib/api";
import { motion } from "framer-motion";

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
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
                ? "rgba(16, 185, 129, 0.4)"
                : i % 3 === 1
                ? "rgba(245, 158, 11, 0.4)"
                : "rgba(59, 130, 246, 0.4)",
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
          className="absolute h-48 w-48 rounded-full blur-3xl opacity-15"
          style={{
            background: "linear-gradient(135deg, #10B981, #047857)",
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
          className="absolute h-48 w-48 rounded-full blur-3xl opacity-15"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
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

export default function TeamLogin() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.teamLogin(code, username, password);
      setToken(res.token);
      router.push("/team");
    } catch (err) {
      setMsg(err.message);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center text-white p-4 relative overflow-hidden">
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
            className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="pt-12"
        >
          <motion.h2
            className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-500"
            variants={itemVariants}
          >
            Team Login
          </motion.h2>
          <motion.p className="text-gray-400 mb-6" variants={itemVariants}>
            Enter your credentials to join the tournament
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
            className="space-y-4 text-left"
            variants={itemVariants}
          >
            <div>
              <input
                placeholder="Tournament Code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full p-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent backdrop-blur-sm uppercase"
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                placeholder="Team Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Joining...
                </>
              ) : (
                "Join Tournament"
              )}
            </motion.button>
          </motion.form>

          <motion.div
            className="mt-6 text-center text-sm"
            variants={itemVariants}
          >
            <Link
              href="/"
              className="text-gray-400 hover:text-teal-400 transition-colors duration-300"
            >
              Back to Role Selection
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
