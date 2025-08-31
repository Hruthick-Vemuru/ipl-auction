import React from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  return (
    <div className="grid place-items-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center">
        <h2 className="text-3xl font-bold mb-2 text-blue-400">Admin Login</h2>
        <p className="text-gray-400 mb-8">
          Sign in to create and manage your auctions.
        </p>

        {/* The button is now a simple link to our backend's Google auth route */}
        <a
          href={`${backendUrl}/api/auth/google`}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-800 rounded-lg font-semibold transition-transform transform hover:scale-105"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google logo"
            className="w-6 h-6"
          />
          Sign in with Google
        </a>

        <div className="mt-8 text-center text-sm">
          <Link href="/" className="text-gray-400 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
