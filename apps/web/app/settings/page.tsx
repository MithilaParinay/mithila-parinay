"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, saveMyProfileUpdates } from "@/lib/matrimony";

export default function SettingsPage() {
  const router = useRouter();
  const [sharePhone, setSharePhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Loading settings...");

  useEffect(() => {
    (async () => {
      try {
        const mine = await getMyProfile();
        if (!mine) {
          router.push("/complete-profile");
          return;
        }

        setSharePhone(Boolean(mine.sharePhoneWithMatches));
        setMsg("");
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await saveMyProfileUpdates({ sharePhoneWithMatches: sharePhone });
      setMsg("Settings updated.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section mt-10 mb-12">
      <div className="card-dotted p-8">
        <h1 className="text-3xl font-extrabold text-pink-800">Settings</h1>

        <label className="mt-6 flex items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={sharePhone}
            onChange={(e) => setSharePhone(e.target.checked)}
          />
          Share my phone number with mutual matches only.
        </label>

        <button onClick={save} disabled={busy} className="btn-primary mt-6">
          {busy ? "Saving..." : "Save settings"}
        </button>

        {msg && <p className="mt-4 text-sm text-pink-700">{msg}</p>}
      </div>
    </main>
  );
}
