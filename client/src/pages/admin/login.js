// In client/src/pages/admin/login.js

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, setToken } from "../../lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.query.signedUp) {
      setMsg("Admin created successfully! Please log in.");
    }
  }, [router.query]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      router.push("/admin");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid place-items-center min-h-screen bg-gray-900 text-white p-4">
      <form
        onSubmit={submit}
        className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700"
      >
        <h2 className="text-3xl font-bold mb-2 text-center text-blue-400">
          Admin Login
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Manage your auction tournaments
        </p>

        {msg && (
          <div
            className={`text-center p-3 rounded-lg mb-4 ${
              msg.includes("success")
                ? "bg-green-800 text-green-200"
                : "bg-red-800 text-red-200"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-400">No account? </span>
          {/* CHANGE: Removed the inner <a> tag */}
          <Link href="/admin/signup" className="text-blue-400 hover:underline">
            Create Admin
          </Link>
        </div>
      </form>
    </div>
  );
}
