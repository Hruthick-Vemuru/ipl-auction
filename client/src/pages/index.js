/********************************************************************************
 * --- FILE: client/src/pages/index.js (FINAL REDESIGN) ---
 ********************************************************************************/
// FINAL VERSION: The homepage has been updated with the new, official
// application name: "Hruthick's Auction Table".

import Link from "next/link";

export default function ChooseRole() {
  return (
    <div
      className="min-h-screen grid place-items-center bg-gray-900 text-white p-4"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1599551433433-c70f0b4d4b8e?q=80&w=2070&auto=format&fit=crop')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative z-10 bg-black/40 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-lg text-center border border-white/10">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-blue-400 tracking-tight">
          Hruthick's Auction Table
        </h1>
        <p className="text-gray-300 mb-10 text-lg">
          The Ultimate Platform for Live Sports Auctions. Your Auction, Your
          Rules.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/admin/login"
            className="w-full text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-transform transform hover:scale-105"
          >
            I&apos;m an Auction Admin
          </Link>
          <Link
            href="/team/login"
            className="w-full text-center py-3 px-4 bg-teal-500 hover:bg-teal-600 rounded-lg text-lg font-semibold transition-transform transform hover:scale-105"
          >
            I&apos;m a Team Owner
          </Link>
        </div>
      </div>
    </div>
  );
}
