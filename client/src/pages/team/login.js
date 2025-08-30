// In client/src/pages/team/login.js

import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api, setToken } from "../../lib/api";

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
      // Note the API function name change for clarity
      const res = await api.auth.teamLogin(code, username, password);
      setToken(res.token);
      router.push("/team"); // Navigate to the team dashboard
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
        <h2 className="text-3xl font-bold mb-2 text-center text-teal-400">
          Team Login
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Enter your credentials to join the tournament
        </p>

        {msg && (
          <div className="text-center p-3 rounded-lg mb-4 bg-red-800 text-red-200">
            {msg}
          </div>
        )}

        <div className="space-y-4">
          <input
            placeholder="Tournament Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
          />
          <input
            placeholder="Team Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 py-3 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? "Joining..." : "Join Tournament"}
        </button>
        <div className="mt-6 text-center text-sm">
          <Link href="/" className="text-gray-400 hover:underline">
            Back to Role Selection
          </Link>
        </div>
      </form>
    </div>
  );
}
