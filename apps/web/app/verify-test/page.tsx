"use client";

import { useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";


const client = generateClient<Schema>();

export default function VerifyTestPage() {
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function createVR() {
    setErr("");
    setResult(null);

    const user = await getCurrentUser();

    const { data, errors } = await client.models.VerificationRequest.create({
      profileId: "test-profile-001",
      country: "United States",
      isOutsideIndia: true,
      status: "DRAFT",
      createdByUserId: user.userId,
    });

    if (errors?.length) {
      setErr(errors.map((e: any) => e.message).join(", "));
      return;
    }

    setResult(data);
  }

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>VerificationRequest Test</h1>

      <button onClick={createVR} style={{ padding: 12, marginTop: 12 }}>
        Create VerificationRequest
      </button>

      {err && <p style={{ color: "red", marginTop: 16 }}>{err}</p>}
      {result && (
        <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 16, overflow: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <p style={{ marginTop: 16 }}>
        First go to <code>/login</code> and sign in, then come back here.
      </p>
    </div>
  );
}
