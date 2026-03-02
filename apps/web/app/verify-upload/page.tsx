"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadData } from "aws-amplify/storage";
import { client } from "@/lib/amplifyClient";
import { getCurrentAccount, getMyProfile } from "@/lib/matrimony";
import SelfieCapture from "@/app/profile/selfieCapture";

type DocType = "visa" | "paystub" | "offerletter" | "idfront" | "idback";

export default function VerifyUploadPage() {
  const [profile, setProfile] = useState<any>(null);
  const [vr, setVr] = useState<any>(null);
  const [idType, setIdType] = useState("PASSPORT");
  const [idNumber, setIdNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Loading verification...");

  const profileId = useMemo(() => profile?.id as string | undefined, [profile]);

  async function loadLatest(profileIdValue: string) {
    const res = await client.models.VerificationRequest.list({
      filter: { profileId: { eq: profileIdValue } } as any,
      limit: 100,
    });

    const sorted = (res.data ?? []).sort((a: any, b: any) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const latest = sorted[0] ?? null;

    setVr(latest);
    if (latest?.idType) setIdType(latest.idType);
    if (latest?.idNumber) setIdNumber(latest.idNumber);
  }

  useEffect(() => {
    (async () => {
      try {
        const mine = await getMyProfile();
        if (!mine) {
          setMsg("Create profile first.");
          return;
        }

        setProfile(mine);
        await loadLatest(mine.id);
        setMsg("");
      } catch {
        setMsg("Please login to continue.");
      }
    })();
  }, []);

  async function ensureDraft() {
    if (!profileId || !profile) throw new Error("Profile not available.");
    if (vr && ["DRAFT", "NEEDS_MORE_INFO"].includes(vr.status)) return vr;

    const { accountId } = await getCurrentAccount();
    const created = await client.models.VerificationRequest.create({
      profileId,
      createdByUserId: accountId,
      country: profile.country,
      isOutsideIndia: (profile.country || "").trim().toLowerCase() !== "india",
      status: "DRAFT",
      selfieCheckStatus: "PENDING",
      idType: idType as any,
      idNumber,
    } as any);

    if (created.errors?.length) {
      throw new Error(created.errors.map((e: any) => e.message).join(", "));
    }

    setVr(created.data);
    return created.data;
  }

  async function uploadAndSave(docType: DocType, file: File) {
    if (!profileId) return;

    if (!file) return;

    const allow = ["application/pdf", "image/jpeg", "image/png"];
    if (!allow.includes(file.type)) {
      setMsg("Only PDF, JPG, PNG files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg("Maximum file size is 10MB.");
      return;
    }

    setBusy(true);
    setMsg(`Uploading ${docType}...`);

    try {
      const draft = await ensureDraft();
      const path = `private/verification/${profileId}/${draft.id}/${docType}-${Date.now()}-${file.name}`;

      await uploadData({
        path,
        data: file,
        options: { contentType: file.type },
      }).result;

      const patch: any = { id: draft.id, idType: idType as any, idNumber };
      if (docType === "visa") patch.visaDocKey = path;
      if (docType === "idfront") patch.idFrontKey = path;
      if (docType === "idback") patch.idBackKey = path;
      if (docType === "paystub") patch.payStubKey = path;
      if (docType === "offerletter") patch.offerLetterKey = path;

      const updated = await client.models.VerificationRequest.update(patch);
      if (updated.errors?.length) {
        throw new Error(updated.errors.map((e: any) => e.message).join(", "));
      }

      setVr(updated.data);
      setMsg(`Uploaded ${docType}.`);
    } catch (e: any) {
      setMsg(e?.message ?? `Failed to upload ${docType}.`);
    } finally {
      setBusy(false);
    }
  }

  async function onSelfieCapture(file: File) {
    if (!profileId) return;

    setBusy(true);
    setMsg("Uploading live selfie...");

    try {
      const draft = await ensureDraft();
      const path = `private/verification/${profileId}/${draft.id}/selfie-${Date.now()}.jpg`;

      await uploadData({
        path,
        data: file,
        options: { contentType: "image/jpeg" },
      }).result;

      const updated = await client.models.VerificationRequest.update({
        id: draft.id,
        selfieKey: path,
        selfieCheckStatus: "PENDING",
        selfieCheckReason: null,
      } as any);

      if (updated.errors?.length) {
        throw new Error(updated.errors.map((e: any) => e.message).join(", "));
      }

      setVr(updated.data);
      setMsg("Live selfie captured. Auto-check in progress.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to upload selfie.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    if (!profileId || !profile) return;

    try {
      setBusy(true);
      const draft = await ensureDraft();

      if (!draft.visaDocKey || !draft.idFrontKey || !draft.selfieKey || !idNumber) {
        setMsg("Visa, ID document, ID number, and live selfie are mandatory.");
        return;
      }

      if (draft.selfieCheckStatus === "FAIL") {
        setMsg("Selfie verification failed. Please retake the live selfie.");
        return;
      }

      const nextSelfieVerified = draft.selfieCheckStatus === "PASS" || Boolean(draft.selfieKey);
      const nextIdVerified = Boolean(draft.idFrontKey);

      const vrUpdate = await client.models.VerificationRequest.update({
        id: draft.id,
        idType: idType as any,
        idNumber,
        status: "SUBMITTED",
      } as any);

      if (vrUpdate.errors?.length) {
        throw new Error(vrUpdate.errors.map((e: any) => e.message).join(", "));
      }

      await client.models.Profile.update({
        id: profileId,
        idVerified: nextIdVerified,
        selfieVerified: nextSelfieVerified,
        isVerified: nextIdVerified && nextSelfieVerified,
      } as any);

      await loadLatest(profileId);
      setMsg("Verification submitted. Badge updates after checks/review.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to submit verification.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!profileId) return;
    await loadLatest(profileId);
    setMsg("Verification status refreshed.");
  }

  return (
    <main className="section mt-10 mb-12">
      <div className="card-dotted p-8 md:p-10">
        <h1 className="text-3xl font-extrabold text-pink-800">Verification Center</h1>
        <p className="mt-2 text-slate-600">
          Mandatory: visa document, one valid ID, and a live selfie capture. Optional: salary paystub and offer letter.
        </p>

        {profile && (
          <p className="mt-3 text-sm text-slate-700">
            Profile: <b>{profile.fullName}</b> · Status: <b>{vr?.status || "Not started"}</b>
            {vr?.selfieCheckStatus ? ` · Selfie check: ${vr.selfieCheckStatus}` : ""}
          </p>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-pink-800">ID type *</label>
            <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>
              <option value="DL">Driving License</option>
              <option value="PAN">PAN Card</option>
              <option value="VOTER_ID">Voter ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="AADHAR">Aadhar Card</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-pink-800">ID number *</label>
            <input className="input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <UploadRow label="Visa document (mandatory)" busy={busy} onPick={(f) => uploadAndSave("visa", f)} />
          <UploadRow label="ID front (mandatory)" busy={busy} onPick={(f) => uploadAndSave("idfront", f)} />
          <UploadRow label="ID back (optional)" busy={busy} onPick={(f) => uploadAndSave("idback", f)} />
          <UploadRow label="Salary paystub (optional)" busy={busy} onPick={(f) => uploadAndSave("paystub", f)} />
          <UploadRow label="Offer letter (optional)" busy={busy} onPick={(f) => uploadAndSave("offerletter", f)} />
        </div>

        <div className="mt-6 rounded-2xl border border-pink-100 bg-white p-4">
          <SelfieCapture onCapture={onSelfieCapture} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={refresh} disabled={busy} className="btn-outline">Refresh status</button>
          <button onClick={submitForReview} disabled={busy} className="btn-primary">Submit verification</button>
        </div>

        {msg && <p className="mt-4 text-sm font-semibold text-pink-700">{msg}</p>}
      </div>
    </main>
  );
}

function UploadRow({
  label,
  onPick,
  busy,
}: {
  label: string;
  onPick: (file: File) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-4">
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="file"
        className="input"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </div>
  );
}
