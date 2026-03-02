"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VerificationBadge from "@/components/verificationBadge";
import {
  FeedFilters,
  likeProfile,
  listFeedProfiles,
  rejectProfile,
  undoRejectProfile,
  getMyProfile,
} from "@/lib/matrimony";
import { calculateCompletion } from "@/lib/profileCompletion";

const EMPTY_FILTERS = {
  radiusKm: "",
  locationQuery: "",
  minAge: "",
  maxAge: "",
  minHeightCm: "",
  maxHeightCm: "",
  raisedIn: "",
  education: "",
  career: "",
};

function toNumber(input: string) {
  if (!input) return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFilters(input: typeof EMPTY_FILTERS): FeedFilters {
  return {
    radiusKm: toNumber(input.radiusKm),
    locationQuery: input.locationQuery.trim() || undefined,
    minAge: toNumber(input.minAge),
    maxAge: toNumber(input.maxAge),
    minHeightCm: toNumber(input.minHeightCm),
    maxHeightCm: toNumber(input.maxHeightCm),
    raisedIn: input.raisedIn.trim() || undefined,
    education: input.education.trim() || undefined,
    career: input.career.trim() || undefined,
  };
}

function hasActiveFilters(filters: FeedFilters) {
  return Boolean(
    filters.locationQuery ||
      filters.minAge ||
      filters.maxAge ||
      filters.minHeightCm ||
      filters.maxHeightCm ||
      filters.raisedIn ||
      filters.education ||
      filters.career
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("Loading profiles...");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [lastRejected, setLastRejected] = useState<any>(null);
  const [showingFallback, setShowingFallback] = useState(false);

  const parsedFilters = useMemo(() => parseFilters(filters), [filters]);

  async function load(currentFilters = parsedFilters) {
    try {
      const mine = await getMyProfile();
      if (!mine || calculateCompletion(mine) < 75) {
        router.push("/complete-profile");
        return;
      }

      const filtered = await listFeedProfiles(currentFilters);
      if (filtered.length > 0) {
        setItems(filtered);
        setShowingFallback(false);
        setMsg("");
        return;
      }

      if (hasActiveFilters(currentFilters)) {
        const fallback = await listFeedProfiles({}, { ignoreFilters: true });
        setItems(fallback);
        setShowingFallback(true);
        setMsg(
          fallback.length
            ? "No matches found with those filters. Showing other profiles you may be interested in."
            : "No profiles available right now. Please check again later."
        );
      } else {
        setItems([]);
        setShowingFallback(false);
        setMsg("No profiles available right now. Please check again later.");
      }
    } catch {
      router.push("/login");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLike(item: any) {
    setBusyId(item.id);
    try {
      const res = await likeProfile(item.id);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setMsg(res.matched ? `It is a mutual like with ${item.fullName}. You can chat in Messages.` : "Interest sent.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to like profile.");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(item: any) {
    setBusyId(item.id);
    try {
      await rejectProfile(item.id);
      setLastRejected(item);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setMsg("Profile rejected. You can undo this action.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to reject profile.");
    } finally {
      setBusyId(null);
    }
  }

  async function onUndoReject() {
    if (!lastRejected) return;
    setBusyId(lastRejected.id);
    try {
      await undoRejectProfile(lastRejected.id);
      setLastRejected(null);
      await load();
      setMsg("Last reject has been undone.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to undo reject.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="section mt-10 mb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-pink-800">Matches for you</h1>
          <p className="mt-2 text-lg text-slate-600">Like or reject directly from feed. Mutual likes unlock chat.</p>
        </div>

        {lastRejected && (
          <button onClick={onUndoReject} disabled={busyId === lastRejected.id} className="btn-outline text-sm">
            Undo last reject
          </button>
        )}
      </div>

      <section className="mt-6 rounded-[24px] border border-pink-100 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-pink-800">Filters</h2>
        <p className="mt-1 text-sm text-slate-600">Radius, location, age, height, raised in, education, and career.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Radius (km)</label>
            <input
              className="input"
              type="number"
              min={10}
              max={5000}
              value={filters.radiusKm}
              onChange={(e) => setFilters((prev) => ({ ...prev, radiusKm: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Location</label>
            <input
              className="input"
              value={filters.locationQuery}
              placeholder="City, state or country"
              onChange={(e) => setFilters((prev) => ({ ...prev, locationQuery: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Min age</label>
            <input
              className="input"
              type="number"
              min={18}
              max={70}
              value={filters.minAge}
              onChange={(e) => setFilters((prev) => ({ ...prev, minAge: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Max age</label>
            <input
              className="input"
              type="number"
              min={18}
              max={70}
              value={filters.maxAge}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxAge: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Min height (cm)</label>
            <input
              className="input"
              type="number"
              min={120}
              max={230}
              value={filters.minHeightCm}
              onChange={(e) => setFilters((prev) => ({ ...prev, minHeightCm: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Max height (cm)</label>
            <input
              className="input"
              type="number"
              min={120}
              max={230}
              value={filters.maxHeightCm}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxHeightCm: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Raised in</label>
            <input
              className="input"
              value={filters.raisedIn}
              placeholder="e.g. Bihar"
              onChange={(e) => setFilters((prev) => ({ ...prev, raisedIn: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Education</label>
            <input
              className="input"
              value={filters.education}
              placeholder="e.g. Masters"
              onChange={(e) => setFilters((prev) => ({ ...prev, education: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold tracking-wide text-slate-600 uppercase">Career</label>
            <input
              className="input"
              value={filters.career}
              placeholder="e.g. Software"
              onChange={(e) => setFilters((prev) => ({ ...prev, career: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-primary text-sm" onClick={() => load(parsedFilters)}>
            Apply filters
          </button>
          <button
            type="button"
            className="btn-outline text-sm"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              load(parseFilters(EMPTY_FILTERS));
            }}
          >
            Reset filters
          </button>
        </div>
      </section>

      {showingFallback && (
        <p className="mt-5 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700">
          No matches found with those filters. Other profiles that you may be interested in are shown below.
        </p>
      )}

      <div className="mt-7 space-y-5">
        {items.map((item) => (
          <article key={item.id} className="rounded-[28px] border border-pink-100 bg-white/85 p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row">
              <div className="h-44 w-full overflow-hidden rounded-2xl border border-pink-100 bg-slate-100 md:w-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item._imageUrl || "/next.svg"}
                  alt={item.fullName || "Profile"}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-pink-900">
                    {item.fullName} {item._age ? `· ${item._age} yrs` : ""}
                  </h2>
                  <VerificationBadge idVerified={item.idVerified} selfieVerified={item.selfieVerified} />
                </div>

                <p className="mt-1 text-lg text-slate-600">
                  {(item.city || "Unknown city")}, {(item.state || "-")}, {(item.country || "Unknown country")}
                </p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                  {item.education && <span className="rounded-full bg-pink-50 px-3 py-1">{item.education}</span>}
                  {(item.career || item.occupation) && <span className="rounded-full bg-pink-50 px-3 py-1">{item.career || item.occupation}</span>}
                  {item.heightCm && <span className="rounded-full bg-pink-50 px-3 py-1">{item.heightCm} cm</span>}
                  {item.raisedIn && <span className="rounded-full bg-pink-50 px-3 py-1">Raised in {item.raisedIn}</span>}
                </div>

                <p className="mt-3 text-slate-700 line-clamp-2">
                  {item.about || "Profile details available in full view."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => onReject(item)}
                    disabled={busyId === item.id}
                    className="h-11 w-11 rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600"
                    aria-label="Reject profile"
                  >
                    x
                  </button>

                  <Link href={`/profile/${item.id}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700" aria-label="Open profile">
                    &gt;
                  </Link>

                  <button
                    onClick={() => onLike(item)}
                    disabled={busyId === item.id}
                    className="h-11 w-11 rounded-full bg-emerald-500 text-lg font-bold text-white"
                    aria-label="Like profile"
                  >
                    ✓
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {msg && <p className="mt-5 text-sm font-semibold text-pink-700">{msg}</p>}
    </main>
  );
}
