"use client";

import "@/lib/amplifyClient";
import { useState } from "react";
import { resetPassword } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function sendCode() {
    try {
      setMsg("");
      const username = email.trim();

      const res = await resetPassword({ username });

      // Usually email OTP; Amplify returns nextStep with delivery details
      const destination = res?.nextStep?.codeDeliveryDetails?.destination;
      setMsg(destination ? `Code sent to ${destination}` : "Code sent. Check your email.");

      router.push(`/forgot-password/confirm?email=${encodeURIComponent(username)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to send code");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "70px auto", padding: 18 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Reset your password</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Enter your email. We’ll send you a verification code.
      </p>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontWeight: 700 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 12, marginTop: 6 }}
          placeholder="you@email.com"
        />
      </div>

      <button onClick={sendCode} style={{ width: "100%", padding: 14, marginTop: 16, fontWeight: 800 }}>
        Send code
      </button>

      <div style={{ marginTop: 12 }}>
        <Link href="/login" style={{ textDecoration: "underline" }}>Back to login</Link>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}