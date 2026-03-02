"use client";

import { useEffect, useState } from "react";
import { client } from "@/lib/amplifyClient";

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [msg, setMsg] = useState("Loading...");

  async function load() {
    const res = await client.models.VerificationRequest.list({
      filter: { status: { eq: "SUBMITTED" } } as any,
      limit: 200,
    });
    setRequests(res.data ?? []);
    setMsg("");
  }

  useEffect(() => {
    load().catch((e) => setMsg(e?.message ?? "Unable to load verification queue."));
  }, []);

  async function approve(req: any) {
    setMsg("Approving...");

    await client.models.VerificationRequest.update({
      id: req.id,
      status: "APPROVED",
      reviewNotes: "Approved by admin",
    } as any);

    await client.models.Profile.update({
      id: req.profileId,
      idVerified: Boolean(req.idFrontKey),
      selfieVerified: req.selfieCheckStatus === "PASS" || Boolean(req.selfieKey),
      isVerified: Boolean(req.idFrontKey) && (req.selfieCheckStatus === "PASS" || Boolean(req.selfieKey)),
    } as any);

    await load();
    setMsg("Approved.");
  }

  async function reject(req: any) {
    setMsg("Rejecting...");

    await client.models.VerificationRequest.update({
      id: req.id,
      status: "REJECTED",
      reviewNotes: "Rejected by admin",
    } as any);

    await client.models.Profile.update({
      id: req.profileId,
      isVerified: false,
    } as any);

    await load();
    setMsg("Rejected.");
  }

  return (
    <main className="section mt-10 mb-12">
      <h1 className="text-3xl font-extrabold text-pink-800">Admin Verification Queue</h1>
      <p className="mt-2 text-sm text-slate-600">Approve or reject submitted verification requests.</p>

      <div className="mt-6 space-y-4">
        {requests.map((req) => (
          <article key={req.id} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <p><b>Profile:</b> {req.profileId}</p>
            <p><b>Status:</b> {req.status}</p>
            <p><b>ID Type:</b> {req.idType || "-"}</p>
            <p><b>Selfie Check:</b> {req.selfieCheckStatus || "PENDING"}</p>
            <p><b>Notes:</b> {req.reviewNotes || "-"}</p>

            <div className="mt-4 flex gap-3">
              <button className="btn-primary" onClick={() => approve(req)}>Approve</button>
              <button className="btn-outline" onClick={() => reject(req)}>Reject</button>
            </div>
          </article>
        ))}
      </div>

      {msg && <p className="mt-4 text-sm text-pink-700">{msg}</p>}
    </main>
  );
}
