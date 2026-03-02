"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchAuthSession, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { clearSessionCaches, getMyProfile } from "@/lib/matrimony";

export default function Navbar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const refreshingRef = useRef(false);

  async function refreshAuthState() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const session = await fetchAuthSession();
      const hasTokens = Boolean(session.tokens?.idToken || session.tokens?.accessToken);

      if (!hasTokens) {
        clearSessionCaches();
        setAuthed(false);
        setName("");
        return;
      }

      setAuthed(true);

      const profile = await getMyProfile().catch(() => null);
      const fullName = profile?.fullName || "Member";
      setName(fullName);
    } catch {
      setAuthed(false);
      setName("");
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await refreshAuthState();
    })();

    const hub = Hub.listen("auth", () => {
      refreshAuthState().catch(() => undefined);
    });

    return () => {
      mounted = false;
      hub();
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const homeHref = authed ? "/feed" : "/";

  return (
    <header className="relative z-50 border-b border-pink-100 bg-white/90 backdrop-blur">
      <div className="section flex items-center justify-between py-4">
        <Link href={homeHref} className="flex items-center gap-3">
          {!logoError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand-logo.png"
              alt="Mithila Parinay"
              className="h-11 w-11 rounded-full border border-pink-100 object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-sm font-extrabold text-white">
              MP
            </div>
          )}
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-[0.18em] text-pink-700">Mithila Parinay</div>
            <div className="text-xs text-pink-500">Love, the Cultural Way</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/features" className="hover:text-pink-700">Features</Link>
          <Link href="/how-it-works" className="hover:text-pink-700">How it works</Link>
          <Link href="/faq" className="hover:text-pink-700">FAQ</Link>
        </nav>

        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : !authed ? (
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-outline text-sm">Login</Link>
            <Link href="/register" className="btn-primary text-sm">Create Profile</Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/messages" className="btn-outline text-sm">Messages</Link>
            <div ref={menuRef} className="relative z-[60]">
              <button
                className="btn-outline text-sm"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                Namaste, {name || "Member"} ▼
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-[70] mt-2 w-56 rounded-2xl border border-pink-100 bg-white p-2 shadow-xl">
                  <Link
                    href="/profile/preview"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-pink-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile Preview
                  </Link>
                  <Link
                    href="/complete-profile"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-pink-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-pink-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    onClick={async () => {
                      setMenuOpen(false);
                      clearSessionCaches();
                      await signOut();
                      window.location.href = "/";
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
