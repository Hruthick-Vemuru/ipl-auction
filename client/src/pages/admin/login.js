import React, { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, setToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

// --- Reusable Notification Component for this page ---
const Notification = memo(function Notification({
  message,
  onClose,
  type = "info",
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-dismiss after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose, message]);

  const bgColor = type === "error" ? "bg-red-600" : "bg-blue-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 ${bgColor} flex items-center`}
    >
      {message}
      <button
        onClick={onClose}
        className="ml-4 font-bold opacity-70 hover:opacity-100"
      >
        &times;
      </button>
    </motion.div>
  );
});

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
                ? "rgba(59, 130, 246, 0.4)"
                : i % 3 === 1
                ? "rgba(245, 158, 11, 0.4)"
                : "rgba(16, 185, 129, 0.4)",
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
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
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

export default function AdminLoginPage() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [notificationType, setNotificationType] = useState("info");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.adminLogin(email, password);
      setToken(res.token);

      // Success notification
      setNotificationType("info");
      setNotification("Login successful! Redirecting...");

      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch (err) {
      setMsg(err.message);
      setNotificationType("error");
      setNotification(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showComingSoon = (platform) => {
    setNotificationType("info");
    setNotification(
      `${platform} authentication is a work in progress. Coming soon!`
    );
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

      <AnimatePresence>
        {notification && (
          <Notification
            message={notification}
            onClose={() => setNotification(null)}
            type={notificationType}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="bg-gray-800 bg-opacity-70 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative elements */}
        <div className="absolute -top-14 left-1/2 transform -translate-x-1/2">
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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
            className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500"
            variants={itemVariants}
          >
            Admin Login
          </motion.h2>
          <motion.p className="text-gray-400 mb-6" variants={itemVariants}>
            Sign in to create and manage your auctions.
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
            onSubmit={handleLogin}
            className="space-y-4 text-left"
            variants={itemVariants}
          >
            <div>
              <input
                placeholder="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
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
                className="w-full p-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </motion.form>

          <motion.div
            className="my-6 flex items-center"
            variants={itemVariants}
          >
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">
              OR CONTINUE WITH
            </span>
            <div className="flex-grow border-t border-gray-600"></div>
          </motion.div>

          <motion.div
            className="grid grid-cols-3 gap-4"
            variants={itemVariants}
          >
            {/* Google Sign-in */}
            <motion.a
              href={`${backendUrl}/api/auth/google`}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white bg-opacity-90 text-gray-800 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-gray-300"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google logo"
                className="w-5 h-5"
              />
            </motion.a>

            {/* X (Twitter) Sign-in - Placeholder */}
            <motion.button
              onClick={() => showComingSoon("X (Twitter)")}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black bg-opacity-80 text-white rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-gray-700"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </motion.button>

            {/* Facebook Sign-in - Placeholder */}
            <motion.button
              onClick={() => showComingSoon("Facebook")}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] bg-opacity-90 text-white rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 5px 15px rgba(24,119,242,0.3)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </motion.button>
          </motion.div>

          <motion.div
            className="mt-6 text-center text-sm"
            variants={itemVariants}
          >
            <Link
              href="/admin/register"
              className="text-gray-400 hover:text-blue-400 transition-colors duration-300"
            >
              Don't have an account?{" "}
              <span className="font-semibold">Register</span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
