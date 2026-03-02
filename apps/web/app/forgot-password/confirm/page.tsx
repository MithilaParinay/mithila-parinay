"use client";

import "@/lib/amplifyClient";
import { useEffect, useState } from "react";
import { confirmResetPassword } from "aws-amplify/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConfirmForgotPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const e = params.get("email") ?? "";
    setEmail(e);
  }, [params]);

  async function updatePassword() {
    try {
      setMsg("");

      if (!email.trim()) {
        setMsg("Email missing. Go back and request code again.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setMsg("Passwords do not match.");
        return;
      }

      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword,
      });

      setMsg("✅ Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 700);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update password");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "70px auto", padding: 18 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Enter code & set new password</h1>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontWeight: 700 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 12, marginTop: 6 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 700 }}>Verification code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: "100%", padding: 12, marginTop: 6 }}
          placeholder="123456"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 700 }}>New password</label>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ width: "100%", padding: 12, marginTop: 6 }}
          type="password"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 700 }}>Confirm new password</label>
        <input
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          style={{ width: "100%", padding: 12, marginTop: 6 }}
          type="password"
        />
      </div>

      <button onClick={updatePassword} style={{ width: "100%", padding: 14, marginTop: 16, fontWeight: 800 }}>
        Update password
      </button>

      <div style={{ marginTop: 12 }}>
        <Link href="/forgot-password" style={{ textDecoration: "underline" }}>
          Resend code
        </Link>
      </div>

      {msg && <p style={{ marginTop: 12, color: msg.startsWith("✅") ? "green" : "tomato" }}>{msg}</p>}
    </div>
  );
}