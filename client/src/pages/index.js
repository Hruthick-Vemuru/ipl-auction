// client/src/pages/index.js
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [activeHover, setActiveHover] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roles = [
    {
      name: "Auction Admin",
      color: "from-blue-500 to-indigo-700",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      route: "/admin",
      description: "Manage auction settings and players",
    },
    {
      name: "Team Owner",
      color: "from-amber-500 to-orange-600",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
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
      ),
      route: "/team",
      description: "Manage your team and bidding strategy",
    },
    {
      name: "Viewer",
      color: "from-emerald-500 to-teal-700",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      route: "/viewer",
      description: "Watch the auction live as a spectator",
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15,
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

  // Floating particles component
  const FloatingParticles = () => {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 12 + 4}px`,
              height: `${Math.random() * 12 + 4}px`,
              background:
                i % 3 === 0
                  ? "linear-gradient(135deg, #3B82F6, #1D4ED8)"
                  : i % 3 === 1
                  ? "linear-gradient(135deg, #F59E0B, #D97706)"
                  : "linear-gradient(135deg, #10B981, #047857)",
            }}
            animate={{
              y: [0, Math.random() * 40 - 20, 0],
              x: [0, Math.random() * 30 - 15, 0],
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
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
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-64 w-64 rounded-full blur-3xl opacity-20"
            style={{
              background:
                i % 2 === 0
                  ? "linear-gradient(135deg, #3B82F6, #1D4ED8)"
                  : "linear-gradient(135deg, #F59E0B, #D97706)",
              top: `${20 + i * 20}%`,
              left: `${i * 25}%`,
            }}
            animate={{
              y: [0, 30, 0],
              x: [0, 20, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i + 4}
            className="absolute h-64 w-64 rounded-full blur-3xl opacity-20"
            style={{
              background: "linear-gradient(135deg, #10B981, #047857)",
              top: `${10 + i * 25}%`,
              right: `${i * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, -20, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 18 + i * 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center text-white overflow-hidden relative">
      {/* Animated background elements */}
      <BackgroundStreaks />
      <FloatingParticles />

      {/* Cricket field lines decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-green-500 opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-green-500 opacity-10"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-green-500 opacity-10"></div>
      </div>

      {/* Header section */}
      <motion.div
        className="text-center mb-12 z-10 px-4"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, type: "spring" }}
      >
        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          IPL Auction Dashboard
        </motion.h1>

        <motion.p
          className="text-lg text-gray-400 max-w-2xl mx-auto font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Experience the thrill of cricket player auctions with advanced
          management tools
        </motion.p>
      </motion.div>

      {/* Role selection cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-6 z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {roles.map((role, idx) => (
          <motion.div
            key={role.name}
            variants={itemVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.2 },
            }}
            className="relative group"
            onMouseEnter={() => setActiveHover(idx)}
            onMouseLeave={() => setActiveHover(null)}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br rounded-xl ${role.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
            />

            <motion.div
              className="cursor-pointer rounded-xl p-6 flex flex-col justify-center items-center bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700 relative overflow-hidden h-full"
              onClick={() => router.push(role.route)}
              whileHover={{
                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Hover effect border */}
              <motion.div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                style={{ zIndex: -1 }}
              />

              {/* Icon with animation */}
              <motion.div
                className={`mb-5 p-3 rounded-lg bg-gradient-to-br ${role.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}
                initial={{ scale: 0.9, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: idx * 0.15 + 0.5, type: "spring" }}
                whileHover={{
                  scale: 1.1,
                  rotate: 0,
                  transition: { type: "spring", stiffness: 300 },
                }}
              >
                <div className="text-amber-50">{role.icon}</div>
              </motion.div>

              {/* Content */}
              <h2 className="text-xl font-semibold mb-2 text-center text-gray-100">
                {role.name}
              </h2>
              <p className="text-sm text-gray-400 text-center mb-5 font-light">
                {role.description}
              </p>

              {/* Animated button */}
              <motion.div
                className={`px-5 py-2 rounded-lg bg-gradient-to-r ${role.color} bg-opacity-10 border border-gray-600 group-hover:bg-opacity-20 transition-colors duration-300`}
                whileHover={{
                  scale: 1.05,
                }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                  Enter Portal
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer with subtle animation */}
      <motion.div
        className="mt-16 text-gray-500 text-xs z-10 px-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <motion.p
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="font-light"
        >
          Ready for the ultimate cricket auction experience? 🏏
        </motion.p>
      </motion.div>

      {/* Animated connection lines when hovering */}
      {mounted && activeHover !== null && (
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          style={{ opacity: 0.3 }}
        >
          {roles.map((_, idx) => {
            if (idx === activeHover) return null;

            return (
              <motion.line
                key={idx}
                x1="50%"
                y1="50%"
                x2="50%"
                y2="50%"
                stroke="url(#gradient)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            );
          })}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}
