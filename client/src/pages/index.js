// In client/src/pages/index.js

import Link from "next/link";

export default function ChooseRole() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-gray-700">
        <h1 className="text-4xl font-bold mb-2 text-blue-400 tracking-tight">
          Mini IPL Auction
        </h1>
        <p className="text-gray-400 mb-8">Choose your role to get started</p>
        <div className="flex flex-col gap-4">
          {/* CHANGE: Removed the inner <a> tag and applied classes directly to <Link> */}
          <Link
            href="/admin/login"
            className="w-full text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-transform transform hover:scale-105 block"
          >
            I&apos;m an Auction Admin
          </Link>
          {/* CHANGE: Removed the inner <a> tag and applied classes directly to <Link> */}
          <Link
            href="/team/login"
            className="w-full text-center py-3 px-4 bg-teal-500 hover:bg-teal-600 rounded-lg text-lg font-semibold transition-transform transform hover:scale-105 block"
          >
            I&apos;m a Team Owner
          </Link>
        </div>
      </div>
    </div>
  );
}
