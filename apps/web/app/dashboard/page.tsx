"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { client } from "@/lib/amplifyClient";
import { calculateCompletion } from "@/lib/profileCompletion";
import { getCurrentAccount, getMyProfile, resolvePhotoUrls } from "@/lib/matrimony";
import VerificationBadge from "@/components/verificationBadge";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null);
  const [stats, setStats] = useState({ profileViews: 0, interestsReceived: 0, interestsSent: 0 });
  const [msg, setMsg] = useState("Loading dashboard...");

  useEffect(() => {
    (async () => {
      try {
        const mine = await getMyProfile();
        if (!mine) {
          setMsg("No profile found. Please complete your profile.");
          return;
        }
        setProfile(mine);

        const first = mine?.photoKeys?.[0];
        if (first) {
          const urls = await resolvePhotoUrls([first]);
          setHeroPhoto(urls[0] ?? null);
        }

        const { accountId } = await getCurrentAccount();
        const [received, sent] = await Promise.all([
          client.models.Swipe.list({
            filter: { and: [{ toUserId: { eq: accountId } }, { decision: { eq: "LIKE" } }] } as any,
            limit: 150,
          }),
          client.models.Swipe.list({
            filter: { and: [{ fromUserId: { eq: accountId } }, { decision: { eq: "LIKE" } }] } as any,
            limit: 150,
          }),
        ]);

        setStats({
          profileViews: 0,
          interestsReceived: received.data?.length ?? 0,
          interestsSent: sent.data?.length ?? 0,
        });

        setMsg("");
      } catch {
        setMsg("Please login to continue.");
      }
    })();
  }, []);

  const completion = useMemo(() => calculateCompletion(profile), [profile]);

  if (!profile) {
    return <main className="section mt-10 text-sm text-slate-600">{msg}</main>;
  }

  return (
    <main className="section mt-10 mb-12 space-y-8">
      <section>
        <h1 className="text-3xl font-extrabold text-pink-800">
          {profile.fullName}{" "}
          <span className="text-slate-600">{completion}% complete</span>
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Keep your details updated for better matches and trust signals.
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="relative h-[450px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhoto || "/next.svg"}
            alt="Profile hero"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 text-white">
            <p className="text-sm opacity-90">{profile.city || "Unknown city"}, {profile.country || "Unknown country"}</p>
            <p className="text-xl font-bold">{profile.fullName}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard title="Profile Views" value={stats.profileViews} />
        <StatCard title="Interests Received" value={stats.interestsReceived} />
        <StatCard title="Interests Sent" value={stats.interestsSent} />
      </section>

      <section className="card-dotted p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-pink-800">Verification status</h2>
          <VerificationBadge idVerified={profile.idVerified} selfieVerified={profile.selfieVerified} />
        </div>
        <p className="mt-3 text-slate-600">
          Blue tick appears when both ID and selfie checks are completed. Green tick appears when one is pending.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/verify-upload" className="btn-primary">Manage verification</Link>
          <Link href="/profile/preview" className="btn-outline">Profile preview</Link>
          <Link href="/complete-profile" className="btn-outline">Edit profile details</Link>
          <Link href="/messages" className="btn-outline">Open messages</Link>
        </div>
      </section>

      <section className="card-dotted p-8">
        <h3 className="text-xl font-extrabold text-pink-800">About me</h3>
        <p className="mt-3 text-slate-700">{profile.about || "Tell families about yourself in complete profile."}</p>
      </section>

      <section className="card-dotted p-8">
        <h3 className="text-xl font-extrabold text-pink-800">Quick details</h3>
        <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div><b>Gender:</b> {profile.gender || "-"}</div>
          <div><b>Phone:</b> {profile.sharePhoneWithMatches ? profile.phone : "Hidden"}</div>
          <div><b>Occupation:</b> {profile.occupation || "-"}</div>
          <div><b>Salary:</b> {profile.salary || "-"}</div>
          <div><b>Gotra:</b> {profile.gotra || "-"}</div>
          <div><b>Visa:</b> {profile.visaStatus || "-"}</div>
        </div>
      </section>

      {msg && <p className="text-sm text-rose-600">{msg}</p>}
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="card-dotted p-8">
      <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">{title}</p>
      <p className="mt-2 text-3xl font-extrabold text-pink-700">{value}</p>
    </div>
  );
}
