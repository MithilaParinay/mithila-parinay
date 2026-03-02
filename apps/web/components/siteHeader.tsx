"use client";

import Link from "next/link";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { useEffect, useState } from "react";

type Props = {
  showAuthActions?: boolean;
};

export default function SiteHeader({ showAuthActions = true }: Props) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  return (
    <header className="w-full border-b border-pink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* Logo circle like screenshot */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-600 to-orange-400 text-white font-extrabold">
            MP
          </div>

          <div className="leading-tight">
            <div className="text-lg font-extrabold text-pink-700">Mithila Parinay</div>
            <div className="text-xs tracking-[0.2em] text-pink-500">
              MAITHILI MATRIMONY
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <a className="hover:text-pink-700" href="#features">Features</a>
          <a className="hover:text-pink-700" href="#how">How it works</a>
          <a className="hover:text-pink-700" href="#faq">FAQ</a>
        </nav>

        {showAuthActions && (
          <div className="flex items-center gap-3">
            {!authed ? (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-pink-600 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                >
                  Create Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/home"
                  className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-semibold text-pink-700 hover:bg-pink-50"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/";
                  }}
                  className="rounded-full bg-gradient-to-r from-pink-600 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}