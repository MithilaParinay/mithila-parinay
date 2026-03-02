"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfileCarousel from "@/components/profileCarousel";
import PromptCard from "@/components/promptCard";
import VerificationBadge from "@/components/verificationBadge";
import { getProfileById, likeProfile, rejectProfile, resolvePhotoUrls } from "@/lib/matrimony";

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Loading profile...");

  useEffect(() => {
    (async () => {
      try {
        const item = await getProfileById(params.id);
        if (!item) {
          router.push("/feed");
          return;
        }

        setProfile(item);
        const urls = await resolvePhotoUrls((item.photoKeys ?? []).filter(Boolean) as string[]);
        setPhotos(urls);
        setMsg("");
      } catch {
        router.push("/login");
      }
    })();
  }, [params.id, router]);

  async function onLike() {
    if (!profile) return;
    setBusy(true);
    try {
      const res = await likeProfile(profile.id);
      setMsg(res.matched ? "Mutual like! Open Messages to start chat." : "Interest sent.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to like profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!profile) return;
    setBusy(true);
    try {
      await rejectProfile(profile.id);
      router.push("/feed");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to reject profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return <main className="section mt-10 text-sm text-slate-600">{msg}</main>;
  }

  const prompts = [
    { question: profile.promptOneQuestion, answer: profile.promptOneAnswer },
    { question: profile.promptTwoQuestion, answer: profile.promptTwoAnswer },
    { question: profile.promptThreeQuestion, answer: profile.promptThreeAnswer },
  ].filter((item) => item.question && item.answer);

  return (
    <main className="section mt-10 mb-12 space-y-7">
      <ProfileCarousel photos={photos} />

      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-pink-900">{profile.fullName}</h1>
          <VerificationBadge idVerified={profile.idVerified} selfieVerified={profile.selfieVerified} />
        </div>

        <p className="mt-2 text-lg text-slate-600">
          {(profile.city || "Unknown city")}, {(profile.country || "Unknown country")}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={onReject} disabled={busy} className="btn-outline">Reject</button>
          <button onClick={onLike} disabled={busy} className="btn-primary">Like</button>
          <button onClick={() => router.push("/feed")} className="btn-outline">Back to feed</button>
        </div>
      </section>

      <section className="card-dotted p-8">
        <h2 className="text-xl font-extrabold text-pink-800">About</h2>
        <p className="mt-3 text-slate-700">{profile.about || "No about details yet."}</p>
      </section>

      <section className="card-dotted p-8">
        <h2 className="text-xl font-extrabold text-pink-800">Looking for</h2>
        <p className="mt-3 text-slate-700">{profile.lookingFor || "No expectations shared yet."}</p>
      </section>

      <section className="card-dotted p-8">
        <h2 className="text-xl font-extrabold text-pink-800">Quick details</h2>
        <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div><b>Gender:</b> {profile.gender || "-"}</div>
          <div><b>Managed by:</b> {profile.profileManagedBy || "-"}</div>
          <div><b>Occupation:</b> {profile.occupation || "-"}</div>
          <div><b>Career:</b> {profile.career || "-"}</div>
          <div><b>Education:</b> {profile.education || "-"}</div>
          <div><b>Height:</b> {profile.heightCm ? `${profile.heightCm} cm` : "-"}</div>
          <div><b>Salary:</b> {profile.salary || "-"}</div>
          <div><b>Visa:</b> {profile.visaStatus || "-"}</div>
          <div><b>Raised in:</b> {profile.raisedIn || "-"}</div>
          <div><b>Father:</b> {profile.fatherName || "-"}</div>
          <div><b>Mother:</b> {profile.motherName || "-"}</div>
          <div><b>Siblings:</b> {profile.siblings || "-"}</div>
          <div><b>Siblings details:</b> {profile.siblingsDetails || profile.siblingsOccupation || "-"}</div>
          <div><b>Gotra:</b> {profile.gotra || "-"}</div>
        </div>
      </section>

      {prompts.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          {prompts.map((item, idx) => (
            <PromptCard key={`${item.question}-${idx}`} question={item.question} answer={item.answer} />
          ))}
        </section>
      )}

      {msg && <p className="text-sm font-semibold text-pink-700">{msg}</p>}
    </main>
  );
}
