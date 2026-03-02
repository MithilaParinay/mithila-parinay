"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmSignIn,
  confirmSignUp,
  resendSignUpCode,
  signIn,
} from "aws-amplify/auth";
import { calculateCompletion } from "@/lib/profileCompletion";
import { getMyProfile } from "@/lib/matrimony";

function isCodeChallengeStep(step: string | undefined) {
  return (
    step === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE" ||
    step === "CONFIRM_SIGN_IN_WITH_SMS_CODE" ||
    step === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [challengeStep, setChallengeStep] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  async function routeAfterLogin() {
    const profile = await getMyProfile();
    if (!profile) {
      router.push("/complete-profile");
      return;
    }

    const completion = calculateCompletion(profile);
    if (completion < 75) {
      router.push("/complete-profile");
      return;
    }

    router.push("/feed");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!email.trim() || !password) {
      setMsg("Please enter email and password.");
      return;
    }

    setBusy(true);
    try {
      const res = await signIn({
        username: email.trim().toLowerCase(),
        password,
      });

      const step = res.nextStep?.signInStep;
      if (step === "DONE") {
        setChallengeStep(null);
        setNeedsEmailConfirm(false);
        await routeAfterLogin();
        return;
      }

      if (isCodeChallengeStep(step)) {
        setChallengeStep(step);
        setNeedsEmailConfirm(false);
        setMsg("Please enter the verification code sent to your email/phone.");
        return;
      }

      if (step === "CONFIRM_SIGN_UP") {
        setChallengeStep(null);
        setNeedsEmailConfirm(true);
        await resendSignUpCode({ username: email.trim().toLowerCase() }).catch(() => undefined);
        setMsg("Your account is not verified yet. Enter the email verification code below.");
        return;
      }

      setMsg(`Login requires additional verification (${step ?? "unknown"}).`);
    } catch (e: any) {
      if (e?.name === "UserNotFoundException") {
        setMsg("No user with this email id. Please create a profile.");
      } else if (e?.name === "UserNotConfirmedException") {
        setNeedsEmailConfirm(true);
        setChallengeStep(null);
        await resendSignUpCode({ username: email.trim().toLowerCase() }).catch(() => undefined);
        setMsg("Email not verified. Enter the verification code below.");
      } else if (e?.name === "NotAuthorizedException") {
        setMsg("Invalid password. Please try again.");
      } else {
        setMsg(e?.message ?? "Unable to login.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmCode(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!code.trim()) {
      setMsg("Please enter verification code.");
      return;
    }

    setBusy(true);
    try {
      if (needsEmailConfirm) {
        await confirmSignUp({
          username: email.trim().toLowerCase(),
          confirmationCode: code.trim(),
        });

        setNeedsEmailConfirm(false);
        setCode("");

        const loginRes = await signIn({
          username: email.trim().toLowerCase(),
          password,
        });

        const step = loginRes.nextStep?.signInStep;
        if (step === "DONE") {
          await routeAfterLogin();
          return;
        }

        if (isCodeChallengeStep(step)) {
          setChallengeStep(step);
          setMsg("Account verified. Enter the login challenge code.");
          return;
        }

        setMsg("Account verified. Please login again.");
        return;
      }

      if (challengeStep && isCodeChallengeStep(challengeStep)) {
        const res = await confirmSignIn({ challengeResponse: code.trim() });
        const next = res.nextStep?.signInStep;

        if (next === "DONE") {
          setChallengeStep(null);
          setCode("");
          await routeAfterLogin();
          return;
        }

        setMsg(`Additional challenge pending (${next ?? "unknown"}).`);
        return;
      }

      setMsg("No pending verification challenge.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to verify code.");
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    setMsg("");
    if (!email.trim()) {
      setMsg("Please enter email first.");
      return;
    }

    setBusy(true);
    try {
      if (needsEmailConfirm) {
        await resendSignUpCode({ username: email.trim().toLowerCase() });
        setMsg("A new verification code was sent to your email.");
      } else {
        setMsg("If this challenge supports resend, a new code was sent.");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to resend code.");
    } finally {
      setBusy(false);
    }
  }

  const showCodeForm = needsEmailConfirm || Boolean(challengeStep && isCodeChallengeStep(challengeStep));

  return (
    <main className="section-container mt-14">
      <div className="mx-auto max-w-xl card-dotted p-10 md:p-12">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-pink-600">LOGIN</p>
          <h1 className="mt-2 text-3xl font-extrabold text-pink-800">Login to Mithila Parinay</h1>
          <p className="mt-2 text-lg text-slate-600">
            Continue where you left off and connect with like-minded Maithili families.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-lg font-semibold text-pink-800">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-pink-800">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={busy} className="w-full btn-primary py-4 text-lg">
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>

        {showCodeForm && (
          <form onSubmit={onConfirmCode} className="mt-5 space-y-3 rounded-2xl border border-pink-100 bg-white p-4">
            <label className="block text-sm font-semibold text-pink-800">
              {needsEmailConfirm ? "Email verification code" : "Challenge code"}
            </label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn-primary text-sm">
                Verify code
              </button>
              <button type="button" onClick={onResendCode} disabled={busy} className="btn-outline text-sm">
                Resend code
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-pink-700">
          <Link href="/forgot-password" className="hover:underline">Forgot password?</Link>
          <Link href="/register" className="hover:underline">Create profile</Link>
        </div>

        {msg && <p className="mt-5 text-center text-sm font-medium text-rose-600">{msg}</p>}
      </div>
    </main>
  );
}
