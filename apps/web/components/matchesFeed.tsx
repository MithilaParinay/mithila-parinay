"use client";

import { useEffect, useMemo, useState } from "react";
import { client } from "@/lib/amplifyClient";
import { getUrl } from "aws-amplify/storage";

export default function MatchesFeed({ me }: { me: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const geo = useMemo(() => {
    return {
      city: me?.city ?? null,
      state: me?.state ?? null,
      country: me?.country ?? null,
    };
  }, [me]);

  useEffect(() => {
    (async () => {
      setMsg("");

      // Try: city -> state -> country -> all
      const filtersToTry: any[] = [];
      if (geo.city) filtersToTry.push({ city: { eq: geo.city } });
      if (geo.state) filtersToTry.push({ state: { eq: geo.state } });
      if (geo.country) filtersToTry.push({ country: { eq: geo.country } });
      filtersToTry.push(undefined);

      let found: any[] = [];

      for (const f of filtersToTry) {
        const res = await client.models.Profile.list({
          limit: 10,
          ...(f ? { filter: f } : {}),
        });

        // remove myself (best-effort)
        const arr = (res.data ?? []).filter((p: any) => p?.id !== me?.id);

        if (arr.length) {
          found = arr;
          break;
        }
      }

      // Attach first image url for each
      const withImages = await Promise.all(
        found.map(async (p: any) => {
          const key = Array.isArray(p?.photoKeys) ? p.photoKeys[0] : null;
          let url: string | null = null;
          if (key) {
            const u = await getUrl({ path: key });
            url = u.url.toString();
          }
          return { ...p, _img: url };
        })
      );

      setItems(withImages);
    })().catch((e: any) => setMsg(e?.message ?? "Failed to load matches"));
  }, [geo.city, geo.state, geo.country, me?.id]);

  return (
    <div>
      {items.map((p) => (
        <div
          key={p.id}
          className="mb-6 rounded-2xl border border-pink-100 bg-white/70 p-6 shadow-sm"
        >
          <div className="flex gap-5">
            <div className="h-32 w-32 overflow-hidden rounded-2xl border border-pink-100 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p._img ?? "/placeholder.png"}
                alt="profile"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="text-xl font-extrabold text-slate-900">
                {p.fullName ?? "Member"}{" "}
                <span className="text-sm font-semibold text-slate-600">
                  {p?.dateOfBirth ? "" : ""}
                </span>
              </div>
              <div className="mt-1 text-slate-700">
                {(p.city ?? "—")}, {(p.country ?? "—")}
              </div>

              <div className="mt-3 text-slate-700">
                {p?.headline ?? "—"}
              </div>

              {/* <div className="mt-4 text-sm text-slate-600">
                Mutual like unlocks chat and contact details.
              </div> */}
            </div>

            <div className="flex items-center gap-3">
              <button className="h-11 w-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                ✕
              </button>
              <button className="h-11 w-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                →
              </button>
              <button className="h-11 w-11 rounded-full bg-emerald-500 text-white shadow hover:opacity-95">
                ✓
              </button>
            </div>
          </div>
        </div>
      ))}

      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {!msg && items.length === 0 && (
        <p className="text-slate-700">No matches yet. Try completing preferences.</p>
      )}
    </div>
  );
}