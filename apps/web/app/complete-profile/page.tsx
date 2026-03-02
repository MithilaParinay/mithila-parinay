"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPhoneVerificationCode,
  createProfileForCurrentUser,
  getCurrentAccount,
  getProfileById,
  getMyProfile,
  isCurrentUserPhoneVerified,
  resolvePhotoUrls,
  saveMyProfileUpdates,
  sendPhoneVerificationCode,
  uploadProfilePhotos,
} from "@/lib/matrimony";
import { calculateCompletion } from "@/lib/profileCompletion";
import { COUNTRY_OPTIONS, getStatesForCountry } from "@/lib/locationData";
import LocalPhotoGrid from "@/components/profile/localPhotoGrid";
import { DEFAULT_PROFILE_PROMPTS, PROFILE_PROMPT_OPTIONS } from "@/lib/profilePrompts";

const DRAFT_STORAGE_KEY = "mp_complete_profile_draft_v1";

const EMPTY_FORM = {
  phone: "",
  country: "United States",
  state: "",
  city: "",
  zipcode: "",
  raisedIn: "",
  profileManagedBy: "Myself",
  visaStatus: "",
  salary: "",
  occupation: "",
  career: "",
  education: "",
  heightCm: "",
  about: "",
  lookingFor: "",
  siblings: "0",
  siblingsOccupation: "",
  siblingsDetails: "",
  fatherName: "",
  motherName: "",
  fatherOccupation: "",
  motherOccupation: "",
  gotra: "",
  grandfatherName: "",
  grandmotherName: "",
  promptOneQuestion: DEFAULT_PROFILE_PROMPTS[0],
  promptOneAnswer: "",
  promptTwoQuestion: DEFAULT_PROFILE_PROMPTS[1],
  promptTwoAnswer: "",
  promptThreeQuestion: DEFAULT_PROFILE_PROMPTS[2],
  promptThreeAnswer: "",
  sharePhoneWithMatches: false,
};

const EMPTY_CREATE_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  country: "United States",
  state: "",
  city: "",
  zipcode: "",
  raisedIn: "",
  profileManagedBy: "Myself",
  gender: "MALE",
  dateOfBirth: "",
  fatherName: "",
  motherName: "",
};

const SIBLING_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8+"];

const PROFILE_MANAGED_BY_OPTIONS = [
  { value: "Myself", label: "Myself" },
  { value: "Brother", label: "Brother" },
  { value: "Sister", label: "Sister" },
  { value: "Parents", label: "Parents" },
  { value: "Guardian", label: "Guardian" },
  { value: "Others", label: "Others" },
];

function siblingCountValue(value: string) {
  if (value === "8+") return 8;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeProfileManagedBy(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "Myself";
  const map: Record<string, string> = {
    myself: "Myself",
    brother: "Brother",
    sister: "Sister",
    parents: "Parents",
    guardian: "Guardian",
    others: "Others",
    my_self: "Myself",
    son: "Others",
    daughter: "Others",
  };
  return map[raw] ?? "Myself";
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [existingPhotoKeys, setExistingPhotoKeys] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [replacePhotoIndex, setReplacePhotoIndex] = useState<number | null>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Loading profile...");

  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [countriesHydrated, setCountriesHydrated] = useState(false);

  const stateOptions = useMemo(() => getStatesForCountry(form.country), [form.country]);
  const createStateOptions = useMemo(() => getStatesForCountry(createForm.country), [createForm.country]);
  const siblingCount = useMemo(() => siblingCountValue(form.siblings), [form.siblings]);
  const countryOptions = useMemo(
    () => (countriesHydrated ? COUNTRY_OPTIONS : [{ code: "CURRENT", name: form.country || "United States" }]),
    [countriesHydrated, form.country]
  );
  const createCountryOptions = useMemo(
    () => (countriesHydrated ? COUNTRY_OPTIONS : [{ code: "CURRENT_CREATE", name: createForm.country || "United States" }]),
    [countriesHydrated, createForm.country]
  );

  function readDraft() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { profileId?: string; form?: Record<string, unknown> };
    } catch {
      return null;
    }
  }

  function writeDraft(nextForm: Record<string, unknown>, profileId?: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          profileId: profileId ?? profile?.id ?? null,
          form: nextForm,
          savedAt: Date.now(),
        })
      );
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    setCountriesHydrated(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const mine = await getMyProfile();
        const verified = await isCurrentUserPhoneVerified().catch(() => false);
        setPhoneVerified(Boolean(verified));

        if (!mine) {
          const draft = readDraft();
          const draftProfileId = draft?.profileId;
          if (draftProfileId) {
            const fromDraft = await getProfileById(draftProfileId).catch(() => null);
            if (fromDraft) {
              setNeedsProfileCreation(false);
              setProfile(fromDraft);
              setForm((prev: any) => ({
                ...prev,
                ...draft?.form,
                phone: fromDraft.phone ?? prev.phone,
                country: fromDraft.country ?? prev.country,
              }));
              setMsg("");
              return;
            }
          }
          setNeedsProfileCreation(true);
          setMsg("");
          return;
        }

        setNeedsProfileCreation(false);
        setProfile(mine);
        setForm({
          ...EMPTY_FORM,
          phone: mine.phone ?? "",
          country: mine.country ?? "United States",
          state: mine.state ?? "",
          city: mine.city ?? "",
          zipcode: mine.zipcode ?? "",
          raisedIn: mine.raisedIn ?? "",
          profileManagedBy: normalizeProfileManagedBy(mine.profileManagedBy),
          visaStatus: mine.visaStatus ?? "",
          salary: mine.salary ?? "",
          occupation: mine.occupation ?? "",
          career: mine.career ?? "",
          education: mine.education ?? "",
          heightCm: String(mine.heightCm ?? ""),
          about: mine.about ?? "",
          lookingFor: mine.lookingFor ?? "",
          siblings: mine.siblings ?? "0",
          siblingsOccupation: mine.siblingsOccupation ?? "",
          siblingsDetails: mine.siblingsDetails ?? "",
          fatherName: mine.fatherName ?? "",
          motherName: mine.motherName ?? "",
          fatherOccupation: mine.fatherOccupation ?? "",
          motherOccupation: mine.motherOccupation ?? "",
          gotra: mine.gotra ?? "",
          grandfatherName: mine.grandfatherName ?? "",
          grandmotherName: mine.grandmotherName ?? "",
          promptOneQuestion: mine.promptOneQuestion ?? DEFAULT_PROFILE_PROMPTS[0],
          promptOneAnswer: mine.promptOneAnswer ?? "",
          promptTwoQuestion: mine.promptTwoQuestion ?? DEFAULT_PROFILE_PROMPTS[1],
          promptTwoAnswer: mine.promptTwoAnswer ?? "",
          promptThreeQuestion: mine.promptThreeQuestion ?? DEFAULT_PROFILE_PROMPTS[2],
          promptThreeAnswer: mine.promptThreeAnswer ?? "",
          sharePhoneWithMatches: Boolean(mine.sharePhoneWithMatches),
        });
        const draft = readDraft();
        if (draft?.form && (!draft.profileId || draft.profileId === mine.id)) {
          setForm((prev: any) => ({ ...prev, ...draft.form }));
        }

        const keys = Array.isArray(mine.photoKeys) ? mine.photoKeys.filter(Boolean) : [];
        setExistingPhotoKeys(keys as string[]);
        if (keys.length) {
          const urls = await resolvePhotoUrls(keys);
          setExistingPhotoUrls(urls);
        } else {
          setExistingPhotoUrls([]);
        }

        setMsg("");
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  const completion = useMemo(() => calculateCompletion({ ...profile, ...form }), [profile, form]);

  function setValue(key: string, value: any) {
    setForm((prev: any) => {
      const next = { ...prev, [key]: value };
      if (key === "country") {
        next.state = "";
      }
      if (key === "profileManagedBy") {
        next.profileManagedBy = normalizeProfileManagedBy(value);
      }
      if (key === "siblings" && siblingCountValue(value) <= 1) {
        next.siblingsDetails = "";
      }
      writeDraft(next, profile?.id);
      return next;
    });

    if (key === "phone") {
      setPhoneVerified(false);
      setPhoneCodeSent(false);
      setPhoneCode("");
      setPhoneMsg("Phone verification is optional for now.");
    }
  }

  function setCreateValue(key: string, value: string) {
    setCreateForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "country") {
        next.state = "";
      }
      return next;
    });
  }

  async function onSendPhoneCode(currentPhone: string) {
    setPhoneBusy(true);
    setPhoneMsg("");
    try {
      const out = await sendPhoneVerificationCode(currentPhone);
      setPhoneCodeSent(true);
      setPhoneMsg(out.destination ? `Verification code sent to ${out.destination}` : "Verification code sent.");
    } catch (e: any) {
      setPhoneMsg(e?.message ?? "Failed to send verification code.");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function onVerifyPhoneCode() {
    setPhoneBusy(true);
    setPhoneMsg("");
    try {
      const ok = await confirmPhoneVerificationCode(phoneCode);
      setPhoneVerified(Boolean(ok));
      setPhoneMsg(ok ? "Phone verified successfully." : "Verification pending. Please retry.");
    } catch (e: any) {
      setPhoneMsg(e?.message ?? "Invalid verification code.");
    } finally {
      setPhoneBusy(false);
    }
  }

  async function onCreateBaseProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!createForm.firstName || !createForm.lastName || !createForm.phone || !createForm.country || !createForm.gender) {
      setMsg("Please fill all required fields to create your profile.");
      return;
    }

    setCreatingProfile(true);
    try {
      const created = await createProfileForCurrentUser({
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phone: createForm.phone,
        country: createForm.country,
        state: createForm.state || null,
        city: createForm.city || null,
        zipcode: createForm.zipcode || null,
        raisedIn: createForm.raisedIn || null,
        profileManagedBy: createForm.profileManagedBy,
        gender: createForm.gender,
        dateOfBirth: createForm.dateOfBirth || null,
        fatherName: createForm.fatherName || null,
        motherName: createForm.motherName || null,
        photoKeys: [],
      });

      if (!created) {
        throw new Error("Unable to create profile.");
      }

      setProfile(created);
      setNeedsProfileCreation(false);
      setForm({
        ...EMPTY_FORM,
        phone: created.phone ?? "",
        country: created.country ?? "United States",
        state: created.state ?? "",
        city: created.city ?? "",
        zipcode: created.zipcode ?? "",
        raisedIn: created.raisedIn ?? "",
        profileManagedBy: normalizeProfileManagedBy(created.profileManagedBy),
        fatherName: created.fatherName ?? "",
        motherName: created.motherName ?? "",
      });
      setExistingPhotoKeys(Array.isArray(created.photoKeys) ? (created.photoKeys.filter(Boolean) as string[]) : []);
      setExistingPhotoUrls([]);
      setMsg("Profile created. Complete remaining details.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to create profile.");
    } finally {
      setCreatingProfile(false);
    }
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotoKeys((prev) => prev.filter((_, idx) => idx !== index));
    setExistingPhotoUrls((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveExistingPhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= existingPhotoKeys.length) return;

    setExistingPhotoKeys((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });

    setExistingPhotoUrls((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function startReplaceExistingPhoto(index: number) {
    setReplacePhotoIndex(index);
    replacePhotoInputRef.current?.click();
  }

  async function onReplaceExistingPhotoFile(file: File | null) {
    if (replacePhotoIndex === null || !file) return;
    setBusy(true);
    try {
      const { accountId } = await getCurrentAccount();
      const uploaded = await uploadProfilePhotos(accountId, [file]);
      const newKey = uploaded[0];
      if (!newKey) return;
      const newUrl = (await resolvePhotoUrls([newKey]))[0] ?? "";

      const index = replacePhotoIndex;
      setExistingPhotoKeys((prev) => {
        const next = [...prev];
        next[index] = newKey;
        return next;
      });
      setExistingPhotoUrls((prev) => {
        const next = [...prev];
        next[index] = newUrl;
        return next;
      });
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to replace photo.");
    } finally {
      setReplacePhotoIndex(null);
      if (replacePhotoInputRef.current) {
        replacePhotoInputRef.current.value = "";
      }
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMsg("");

    try {
      let mergedPhotoKeys = [...existingPhotoKeys];

      if (newPhotos.length > 0) {
        const { accountId } = await getCurrentAccount();
        const uploaded = await uploadProfilePhotos(accountId, newPhotos);
        mergedPhotoKeys = [...mergedPhotoKeys, ...uploaded].slice(0, 9);
      }

      const updated = await saveMyProfileUpdates({
        id: profile.id,
        ...form,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        siblingsOccupation: siblingCount <= 1 ? form.siblingsOccupation : "",
        siblingsDetails: siblingCount > 1 ? form.siblingsDetails : "",
        photoKeys: mergedPhotoKeys,
      });

      setProfile(updated);
      setNewPhotos([]);
      setExistingPhotoKeys(mergedPhotoKeys);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      const resolved = await resolvePhotoUrls(
        mergedPhotoKeys
      );
      setExistingPhotoUrls(resolved);

      const nextCompletion = calculateCompletion(updated);
      if (nextCompletion >= 75) {
        setMsg("Profile saved. Redirecting to your feed...");
        setTimeout(() => router.push("/feed"), 600);
      } else {
        setMsg(`Profile saved. Completion is ${nextCompletion}%. Reach at least 75% to enter feed.`);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (needsProfileCreation) {
    return (
      <main className="section mt-10 mb-14">
        <div className="card-dotted p-8 md:p-12">
          <h1 className="text-3xl font-extrabold text-pink-800">Create your profile</h1>
          <p className="mt-2 text-slate-600">
            You are logged in, but no profile exists yet. Add basic details to start.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onCreateBaseProfile}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">This profile is managed by *</label>
              <select className="input" value={createForm.profileManagedBy} onChange={(e) => setCreateValue("profileManagedBy", e.target.value)}>
                {PROFILE_MANAGED_BY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">First name *</label>
                <input className="input" value={createForm.firstName} onChange={(e) => setCreateValue("firstName", e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Last name *</label>
                <input className="input" value={createForm.lastName} onChange={(e) => setCreateValue("lastName", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Phone number *</label>
                <input className="input" value={createForm.phone} onChange={(e) => setCreateValue("phone", e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Gender *</label>
                <select className="input" value={createForm.gender} onChange={(e) => setCreateValue("gender", e.target.value)}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Country *</label>
                <select className="input" value={createForm.country} onChange={(e) => setCreateValue("country", e.target.value)}>
                  {createCountryOptions.map((country) => (
                    <option key={country.code} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">State *</label>
                <select className="input" value={createForm.state} onChange={(e) => setCreateValue("state", e.target.value)}>
                  <option value="">Select state</option>
                  {createStateOptions.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            {!createStateOptions.length && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">State / Province (manual)</label>
                <input className="input" value={createForm.state} onChange={(e) => setCreateValue("state", e.target.value)} />
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">City</label>
                <input className="input" value={createForm.city} onChange={(e) => setCreateValue("city", e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Zipcode</label>
                <input className="input" value={createForm.zipcode} onChange={(e) => setCreateValue("zipcode", e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Date of birth</label>
                <input className="input" type="date" value={createForm.dateOfBirth} onChange={(e) => setCreateValue("dateOfBirth", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Raised in</label>
                <input className="input" value={createForm.raisedIn} onChange={(e) => setCreateValue("raisedIn", e.target.value)} placeholder="e.g. Darbhanga, Bihar" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-pink-800">Father name</label>
                <input className="input" value={createForm.fatherName} onChange={(e) => setCreateValue("fatherName", e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Mother name</label>
              <input className="input" value={createForm.motherName} onChange={(e) => setCreateValue("motherName", e.target.value)} />
            </div>

            <button type="submit" disabled={creatingProfile} className="btn-primary">
              {creatingProfile ? "Creating profile..." : "Create profile"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm font-semibold text-pink-700">{msg}</p>}
        </div>
      </main>
    );
  }

  if (!profile) {
    return <main className="section mt-14 text-sm text-slate-600">{msg}</main>;
  }

  const existingCount = existingPhotoKeys.length;
  const remainingSlots = Math.max(9 - existingCount, 0);

  return (
    <main className="section mt-10 mb-14">
      <div className="card-dotted p-8 md:p-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-pink-800">Complete your profile</h1>
            <p className="mt-2 text-slate-600">
              Complete at least 75% of your profile to unlock the feed and matching.
            </p>
          </div>
          <div className="rounded-full border border-pink-200 bg-white px-5 py-2 text-sm font-bold text-pink-700">
            Completion: {completion}%
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <section className="rounded-2xl border border-pink-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-pink-800">Profile photos</h3>
                <p className="text-sm text-slate-600">
                  Reorder, replace, or remove existing photos. Then add new photos up to a total of 9.
                </p>
              </div>
            </div>

            <input
              ref={replacePhotoInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => onReplaceExistingPhotoFile(e.target.files?.[0] ?? null)}
            />

            {existingPhotoUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {existingPhotoUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-pink-100 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Saved photo ${idx + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute left-2 top-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveExistingPhoto(idx, -1)}
                        disabled={idx === 0}
                        className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExistingPhoto(idx, 1)}
                        disabled={idx === existingPhotoUrls.length - 1}
                        className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => startReplaceExistingPhoto(idx)}
                        className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Replace
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(idx)}
                      className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Remove
                    </button>
                    <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {remainingSlots > 0 ? (
              <div className="mt-4">
                <LocalPhotoGrid
                  files={newPhotos}
                  onChange={setNewPhotos}
                  max={remainingSlots}
                  min={Math.max(0, 3 - existingCount)}
                  title="Add photos"
                />
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-pink-700">You already reached the 9 photo limit.</p>
            )}
          </section>

          <div className="rounded-2xl border border-pink-100 bg-white p-4">
            <h3 className="text-sm font-bold text-pink-800">Phone verification (optional)</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto_auto]">
              <input
                className="input"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setValue("phone", e.target.value)}
              />
              <button
                type="button"
                className="btn-outline"
                disabled={phoneBusy || !form.phone}
                onClick={() => onSendPhoneCode(form.phone)}
              >
                Send code
              </button>
              <span className={`self-center text-sm font-semibold ${phoneVerified ? "text-emerald-600" : "text-slate-500"}`}>
                {phoneVerified ? "Verified" : "Not verified"}
              </span>
            </div>

            {phoneCodeSent && (
              <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
                <input
                  className="input"
                  placeholder="Enter OTP code"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                />
                <button type="button" className="btn-primary" disabled={phoneBusy || !phoneCode} onClick={onVerifyPhoneCode}>
                  Verify code
                </button>
              </div>
            )}

            {phoneMsg && <p className="mt-2 text-xs text-pink-700">{phoneMsg}</p>}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">This profile is managed by</label>
              <select className="input" value={form.profileManagedBy} onChange={(e) => setValue("profileManagedBy", e.target.value)}>
                {PROFILE_MANAGED_BY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Raised in</label>
              <input className="input" value={form.raisedIn} onChange={(e) => setValue("raisedIn", e.target.value)} placeholder="City, State or Country" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Country</label>
              <select className="input" value={form.country} onChange={(e) => setValue("country", e.target.value)}>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.name}>{country.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">State</label>
              <select className="input" value={form.state} onChange={(e) => setValue("state", e.target.value)}>
                <option value="">Select state</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          {!stateOptions.length && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">State / Province (manual)</label>
              <input className="input" value={form.state} onChange={(e) => setValue("state", e.target.value)} />
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">City</label>
              <input className="input" value={form.city} onChange={(e) => setValue("city", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Zipcode</label>
              <input className="input" value={form.zipcode} onChange={(e) => setValue("zipcode", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Visa status</label>
              <input className="input" value={form.visaStatus} onChange={(e) => setValue("visaStatus", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Occupation</label>
              <input className="input" value={form.occupation} onChange={(e) => setValue("occupation", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Career</label>
              <input className="input" value={form.career} onChange={(e) => setValue("career", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Education</label>
              <input className="input" value={form.education} onChange={(e) => setValue("education", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Height (cm)</label>
              <input className="input" type="number" min={120} max={230} value={form.heightCm} onChange={(e) => setValue("heightCm", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Salary</label>
              <input className="input" value={form.salary} onChange={(e) => setValue("salary", e.target.value)} placeholder="e.g. 80000 USD" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-pink-800">About</label>
            <textarea className="input min-h-24" value={form.about} onChange={(e) => setValue("about", e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-pink-800">Looking for / Expectations</label>
            <textarea className="input min-h-24" value={form.lookingFor} onChange={(e) => setValue("lookingFor", e.target.value)} />
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-5">
            <h3 className="text-lg font-extrabold text-pink-800">Prompts </h3>
            <p className="mt-1 text-sm text-slate-600">Pick 3 prompts and answer them to show personality.</p>

            <div className="mt-4 space-y-4">
              <PromptField
                label="Prompt 1"
                question={form.promptOneQuestion}
                answer={form.promptOneAnswer}
                onQuestionChange={(v) => setValue("promptOneQuestion", v)}
                onAnswerChange={(v) => setValue("promptOneAnswer", v)}
              />
              <PromptField
                label="Prompt 2"
                question={form.promptTwoQuestion}
                answer={form.promptTwoAnswer}
                onQuestionChange={(v) => setValue("promptTwoQuestion", v)}
                onAnswerChange={(v) => setValue("promptTwoAnswer", v)}
              />
              <PromptField
                label="Prompt 3"
                question={form.promptThreeQuestion}
                answer={form.promptThreeAnswer}
                onQuestionChange={(v) => setValue("promptThreeQuestion", v)}
                onAnswerChange={(v) => setValue("promptThreeAnswer", v)}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Father name</label>
              <input className="input" value={form.fatherName} onChange={(e) => setValue("fatherName", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Mother name</label>
              <input className="input" value={form.motherName} onChange={(e) => setValue("motherName", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Siblings (count)</label>
              <select className="input" value={form.siblings} onChange={(e) => setValue("siblings", e.target.value)}>
                {SIBLING_OPTIONS.map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
          </div>

          {siblingCount <= 1 ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Sibling occupation</label>
              <input className="input" value={form.siblingsOccupation} onChange={(e) => setValue("siblingsOccupation", e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Siblings details</label>
              <textarea
                className="input min-h-24"
                value={form.siblingsDetails}
                onChange={(e) => setValue("siblingsDetails", e.target.value)}
                placeholder="One sibling per line (name/relation/occupation), e.g. Elder sister - Product Manager"
              />
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Father occupation</label>
              <input className="input" value={form.fatherOccupation} onChange={(e) => setValue("fatherOccupation", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Mother occupation</label>
              <input className="input" value={form.motherOccupation} onChange={(e) => setValue("motherOccupation", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Gotra</label>
              <input className="input" value={form.gotra} onChange={(e) => setValue("gotra", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Grandfather name</label>
              <input className="input" value={form.grandfatherName} onChange={(e) => setValue("grandfatherName", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-pink-800">Grandmother name</label>
              <input className="input" value={form.grandmotherName} onChange={(e) => setValue("grandmotherName", e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.sharePhoneWithMatches}
              onChange={(e) => setValue("sharePhoneWithMatches", e.target.checked)}
            />
            Share my phone number with mutual matches only.
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving..." : "Save profile"}
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={() => router.push("/verify-upload")}
            >
              Complete verification
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={() => router.push("/profile/preview")}
            >
              Preview profile
            </button>
          </div>
        </form>

        {msg && <p className="mt-4 text-sm font-semibold text-pink-700">{msg}</p>}
      </div>
    </main>
  );
}

function PromptField({
  label,
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
}: {
  label: string;
  question: string;
  answer: string;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-pink-100 p-4">
      <label className="mb-2 block text-sm font-semibold text-pink-800">{label}</label>
      <select className="input" value={question} onChange={(e) => onQuestionChange(e.target.value)}>
        {PROFILE_PROMPT_OPTIONS.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <textarea
        className="input mt-3 min-h-20"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Write your answer"
      />
    </div>
  );
}
