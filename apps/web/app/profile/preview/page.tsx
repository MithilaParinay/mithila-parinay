"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateCompletion } from "@/lib/profileCompletion";
import { getMyProfile, resolvePhotoUrls } from "@/lib/matrimony";
import VerificationBadge from "@/components/verificationBadge";
import PromptCard from "@/components/promptCard";

export default function PreviewProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [msg, setMsg] = useState("Loading profile...");

  useEffect(() => {
    (async () => {
      try {
        const mine = await getMyProfile();
        if (!mine) {
          router.push("/complete-profile");
          return;
        }

        setProfile(mine);
        const keys = (mine.photoKeys ?? []).filter(Boolean).slice(0, 9) as string[];
        if (keys.length) {
          const urls = await resolvePhotoUrls(keys);
          setPhotos(urls);
        }
        setMsg("");
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  const completion = useMemo(() => calculateCompletion(profile), [profile]);
  const activePhoto = photos[activePhotoIndex] || "/next.svg";

  const prompts = useMemo(() => {
    if (!profile) return [];

    return [
      { question: profile.promptOneQuestion, answer: profile.promptOneAnswer },
      { question: profile.promptTwoQuestion, answer: profile.promptTwoAnswer },
      { question: profile.promptThreeQuestion, answer: profile.promptThreeAnswer },
    ].filter((item) => item.question && item.answer);
  }, [profile]);

  if (!profile) {
    return <main className="section mt-12 text-sm text-slate-600">{msg}</main>;
  }

  return (
    <main className="section mt-10 mb-12 space-y-7">
      <section className="card overflow-hidden">
        <div className="relative h-[520px] bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activePhoto} alt={profile.fullName} className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-35" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activePhoto} alt={profile.fullName} className="relative z-10 h-full w-full object-contain" />
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 z-30 text-white">
            <h1 className="text-4xl font-extrabold">{profile.fullName}</h1>
            <p className="text-lg">{profile.city || "Unknown city"}, {profile.country || "Unknown country"}</p>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-3 border-t border-pink-100 p-4 md:grid-cols-6">
            {photos.map((photo, idx) => (
              <button
                key={photo}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`aspect-[3/4] overflow-hidden rounded-xl border-2 ${
                  idx === activePhotoIndex ? "border-pink-500" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Profile ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card-dotted p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-pink-800">Profile Preview</h2>
          <VerificationBadge idVerified={profile.idVerified} selfieVerified={profile.selfieVerified} />
        </div>

        <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div><b>Completion:</b> {completion}%</div>
          <div><b>Phone:</b> {profile.sharePhoneWithMatches ? profile.phone : "Hidden"}</div>
          <div><b>Gender:</b> {profile.gender || "-"}</div>
          <div><b>Managed by:</b> {profile.profileManagedBy || "-"}</div>
          <div><b>Occupation:</b> {profile.occupation || "-"}</div>
          <div><b>Career:</b> {profile.career || "-"}</div>
          <div><b>Education:</b> {profile.education || "-"}</div>
          <div><b>Height:</b> {profile.heightCm ? `${profile.heightCm} cm` : "-"}</div>
          <div><b>Salary:</b> {profile.salary || "-"}</div>
          <div><b>Visa:</b> {profile.visaStatus || "-"}</div>
          <div><b>Raised in:</b> {profile.raisedIn || "-"}</div>
          <div><b>Gotra:</b> {profile.gotra || "-"}</div>
        </div>
      </section>

      <section className="card-dotted p-8">
        <h3 className="text-xl font-extrabold text-pink-800">About</h3>
        <p className="mt-3 text-slate-700">{profile.about || "No about section yet."}</p>
      </section>

      <section className="card-dotted p-8">
        <h3 className="text-xl font-extrabold text-pink-800">Looking for</h3>
        <p className="mt-3 text-slate-700">{profile.lookingFor || "No expectations added yet."}</p>
      </section>

      {prompts.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {prompts.map((item, idx) => (
            <PromptCard key={`${item.question}-${idx}`} question={item.question} answer={item.answer} />
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/complete-profile" className="btn-primary">Edit profile</Link>
        <Link href="/verify-upload" className="btn-outline">Update verification</Link>
      </div>
    </main>
  );
}
