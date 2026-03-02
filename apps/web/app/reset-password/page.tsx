"use client";

import SiteHeader from "@/components/siteHeader";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { confirmResetPassword } from "aws-amplify/auth";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const email = useMemo(() => sp.get("email") ?? "", [sp]);

  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");

  async function updatePassword() {
    setMsg("");
    if (!email) return setMsg("Missing email.");
    if (p1 !== p2) return setMsg("Passwords do not match.");

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code.trim(),
        newPassword: p1,
      });

      window.location.href = "/login";
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update password");
    }
  }

  return (
    <main className="min-h-screen bg-[#fff7f4]">
      <SiteHeader />

      <div className="mx-auto mt-16 max-w-xl px-4">
        <div className="rounded-[28px] border border-pink-100 bg-white/70 p-10 shadow-sm">
          <div className="text-center">
            <div className="text-sm font-semibold text-pink-600">VERIFY CODE</div>
            <h1 className="mt-2 text-3xl font-extrabold text-pink-800">Set a new password</h1>
            <p className="mt-2 text-slate-700">
              We sent a code to <b>{email}</b>.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-pink-800">Verification code</label>
              <input
                className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-pink-800">New password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-pink-800">Confirm new password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl border border-pink-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-pink-200"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
              />
            </div>

            <button
              onClick={updatePassword}
              className="w-full rounded-full bg-gradient-to-r from-pink-600 to-orange-400 py-3 font-semibold text-white shadow hover:opacity-95"
            >
              Update password
            </button>

            {msg && <p className="text-center text-sm text-red-600">{msg}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}