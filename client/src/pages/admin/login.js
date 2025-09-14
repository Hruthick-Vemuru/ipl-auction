import React, { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { api, setToken } from "@/lib/api";

// --- Reusable Notification Component for this page ---
const Notification = memo(function Notification({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-dismiss after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose, message]);

  return (
    <div className="fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-50 bg-blue-600 animate-fade-in-down">
      {message}
      <button
        onClick={onClose}
        className="ml-4 font-bold opacity-70 hover:opacity-100"
      >
        &times;
      </button>
    </div>
  );
});

export default function AdminLoginPage() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null); // State for the "Coming Soon" notification
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.adminLogin(email, password);
      setToken(res.token);
      router.push("/admin");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const showComingSoon = () => {
    setNotification("This feature is a work in progress. Coming soon!");
  };

  return (
    <div className="grid place-items-center min-h-screen bg-gray-900 text-white p-4">
      {notification && (
        <Notification
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center">
        <h2 className="text-3xl font-bold mb-2 text-blue-400">Admin Login</h2>
        <p className="text-gray-400 mb-6">
          Sign in to create and manage your auctions.
        </p>

        {msg && (
          <div className="text-center p-3 rounded-lg mb-4 bg-red-800 text-red-200 border border-red-600">
            {msg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-600"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">
            OR CONTINUE WITH
          </span>
          <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Google Sign-in */}
          <a
            href={`${backendUrl}/api/auth/google`}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-800 rounded-lg font-semibold transition-transform transform hover:scale-105"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google logo"
              className="w-6 h-6"
            />
          </a>
          {/* X (Twitter) Sign-in - Placeholder */}
          <button
            onClick={showComingSoon}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black text-white rounded-lg font-semibold transition-transform transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          {/* Facebook Sign-in - Placeholder */}
          <button
            onClick={showComingSoon}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] text-white rounded-lg font-semibold transition-transform transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
            </svg>
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/admin/register"
            className="text-gray-400 hover:underline"
          >
            Don't have an account? Register
          </Link>
        </div>
      </div>
    </div>
  );
}
