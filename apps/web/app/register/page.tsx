"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";
import {
  createProfileForCurrentUser,
  getMyProfile,
  normalizePhone,
  uploadProfilePhotos,
  getCurrentAccount,
} from "@/lib/matrimony";
import LocalPhotoGrid from "@/components/profile/localPhotoGrid";
import { COUNTRY_OPTIONS, getStatesForCountry } from "@/lib/locationData";
import { DEFAULT_PROFILE_PROMPTS, PROFILE_PROMPT_OPTIONS } from "@/lib/profilePrompts";

type StepId = "account" | "photos" | "personal" | "career" | "family" | "prompts";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "account", label: "Account" },
  { id: "photos", label: "Photos" },
  { id: "personal", label: "Personal" },
  { id: "career", label: "Career" },
  { id: "family", label: "Family" },
  { id: "prompts", label: "Prompts" },
];

const PROFILE_MANAGED_BY_OPTIONS = [
  { value: "Myself", label: "Myself" },
  { value: "Brother", label: "Brother" },
  { value: "Sister", label: "Sister" },
  { value: "Parents", label: "Parents" },
  { value: "Guardian", label: "Guardian" },
  { value: "Others", label: "Others" },
];

const SIBLING_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8+"];

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [account, setAccount] = useState({
    email: "",
    password: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [accountVerified, setAccountVerified] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepId>("account");

  const [countriesHydrated, setCountriesHydrated] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const [form, setForm] = useState({
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

    occupation: "",
    career: "",
    education: "",
    heightCm: "",
    salary: "",
    visaStatus: "",
    about: "",
    lookingFor: "",

    fatherName: "",
    motherName: "",
    siblings: "0",
    siblingsOccupation: "",
    siblingsDetails: "",
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
  });

  useEffect(() => {
    setCountriesHydrated(true);
  }, []);

  const stateOptions = useMemo(() => getStatesForCountry(form.country), [form.country]);
  const countryOptions = useMemo(
    () => (countriesHydrated ? COUNTRY_OPTIONS : [{ code: "CURRENT", name: form.country || "United States" }]),
    [countriesHydrated, form.country]
  );

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  function setValue(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "country") next.state = "";
      if (key === "siblings" && (value === "0" || value === "1")) next.siblingsDetails = "";
      if (key === "siblings" && value !== "0" && value !== "1") next.siblingsOccupation = "";
      return next;
    });
  }

  async function ensureSignedIn() {
    await signIn({ username: account.email.trim().toLowerCase(), password: account.password }).catch(() => undefined);
  }

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!account.email.trim() || !account.password) {
      setMsg("Please enter email and password.");
      return;
    }

    setBusy(true);
    try {
      const email = account.email.trim().toLowerCase();
      const result = await signUp({
        username: email,
        password: account.password,
        options: {
          userAttributes: { email },
          autoSignIn: true,
        },
      });

      if (!result.isSignUpComplete && result.nextStep?.signUpStep !== "DONE") {
        setVerificationPending(true);
        setMsg("Verification code sent. Enter code to confirm your email.");
        return;
      }

      await ensureSignedIn();
      setAccountVerified(true);
      setVerificationPending(false);
      setMsg("Email registered successfully. Continue to upload photos.");
      setCurrentStep("photos");
    } catch (e: any) {
      if (e?.name === "UsernameExistsException") {
        // Existing account: attempt login with same password.
        const signInRes = await signIn({ username: account.email.trim().toLowerCase(), password: account.password }).catch((err) => err);

        if (signInRes?.nextStep?.signInStep === "DONE") {
          setAccountVerified(true);
          setVerificationPending(false);
          setMsg("Account already exists. Logged in successfully.");
          setCurrentStep("photos");
          return;
        }

        if (signInRes?.name === "UserNotConfirmedException" || signInRes?.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
          setVerificationPending(true);
          await resendSignUpCode({ username: account.email.trim().toLowerCase() }).catch(() => undefined);
          setMsg("This email exists but is not verified. Enter verification code below.");
          return;
        }

        if (signInRes?.name === "NotAuthorizedException") {
          setMsg("Email exists. Password is incorrect. Try login or reset password.");
          return;
        }

        setMsg("Email already exists. Please login.");
      } else {
        setMsg(e?.message ?? "Unable to create account.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyEmail(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!verificationCode.trim()) {
      setMsg("Please enter verification code.");
      return;
    }

    setBusy(true);
    try {
      const email = account.email.trim().toLowerCase();

      await confirmSignUp({
        username: email,
        confirmationCode: verificationCode.trim(),
      }).catch((e: any) => {
        // If already confirmed, continue login flow.
        if (!String(e?.message ?? "").toUpperCase().includes("CURRENT STATUS IS CONFIRMED")) {
          throw e;
        }
      });

      await ensureSignedIn();
      setAccountVerified(true);
      setVerificationPending(false);
      setMsg("Email verified. Continue with profile photos.");
      setCurrentStep("photos");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to verify email.");
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    setMsg("");
    if (!account.email.trim()) {
      setMsg("Please enter email first.");
      return;
    }

    setBusy(true);
    try {
      await resendSignUpCode({ username: account.email.trim().toLowerCase() });
      setVerificationPending(true);
      setMsg("Verification code sent again.");
    } catch (e: any) {
      setMsg(e?.message ?? "Unable to resend code.");
    } finally {
      setBusy(false);
    }
  }

  function nextStep() {
    if (currentStep === "account") {
      if (!accountVerified) {
        setMsg("Please verify your email first.");
        return;
      }
      setCurrentStep("photos");
      return;
    }

    if (currentStep === "photos" && photos.length < 3) {
      setMsg("Please upload at least 3 photos.");
      return;
    }

    if (currentStep === "personal") {
      if (!form.firstName || !form.lastName || !form.phone || !form.country || !form.gender) {
        setMsg("Please fill required personal details.");
        return;
      }
    }

    setMsg("");
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next.id);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev.id);
  }

  async function onFinalizeProfile() {
    setMsg("");

    if (photos.length < 3) {
      setMsg("Please upload at least 3 photos.");
      setCurrentStep("photos");
      return;
    }

    setBusy(true);
    try {
      await ensureSignedIn();

      const existing = await getMyProfile();
      if (existing) {
        setMsg("This account already has a profile. Opening edit profile.");
        router.push("/complete-profile");
        return;
      }

      const { accountId } = await getCurrentAccount();
      const photoKeys = await uploadProfilePhotos(accountId, photos);

      await createProfileForCurrentUser({
        ...form,
        email: account.email.trim().toLowerCase(),
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        photoKeys,
      });

      router.push("/complete-profile");
    } catch (e: any) {
      if (e?.code === "PROFILE_EXISTS") {
        router.push("/complete-profile");
        return;
      }

      if (e?.code === "DUPLICATE_PERSON") {
        await signOut().catch(() => undefined);
      }
      setMsg(e?.message ?? "Unable to create profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section mt-10 mb-12">
      <div className="mx-auto max-w-4xl card-dotted p-8 md:p-12">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-pink-600">REGISTER</p>
          <h1 className="mt-2 text-3xl font-extrabold text-pink-800">Create your Mithila Parinay account</h1>
          <p className="mt-2 text-lg text-slate-600">Step-by-step profile setup.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                idx <= stepIndex ? "bg-pink-600 text-white" : "bg-pink-50 text-pink-700"
              }`}
            >
              {idx + 1}. {step.label}
            </div>
          ))}
        </div>

        <div className="mt-7">
          {currentStep === "account" && (
            <div className="space-y-5">
              <form onSubmit={onCreateAccount} className="space-y-5">
                <div>
                  <label className="mb-2 block text-lg font-semibold text-pink-800">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={account.email}
                    onChange={(e) => setAccount((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-lg font-semibold text-pink-800">Password *</label>
                  <input
                    className="input"
                    type="password"
                    value={account.password}
                    onChange={(e) => setAccount((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Processing..." : "Register email"}
                </button>
              </form>

              {verificationPending && (
                <form onSubmit={onVerifyEmail} className="rounded-2xl border border-pink-100 bg-white p-5">
                  <h3 className="text-lg font-extrabold text-pink-800">Verify your email</h3>
                  <input
                    className="input mt-3"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" disabled={busy} className="btn-primary text-sm">Verify email</button>
                    <button type="button" onClick={onResendCode} disabled={busy} className="btn-outline text-sm">Resend code</button>
                  </div>
                </form>
              )}

              {accountVerified && (
                <button type="button" className="btn-outline" onClick={() => setCurrentStep("photos")}>Continue</button>
              )}
            </div>
          )}

          {currentStep === "photos" && (
            <LocalPhotoGrid files={photos} onChange={setPhotos} max={9} min={3} title="Upload your profile photos" />
          )}

          {currentStep === "personal" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <InputField label="First name *" value={form.firstName} onChange={(v) => setValue("firstName", v)} />
                <InputField label="Last name *" value={form.lastName} onChange={(v) => setValue("lastName", v)} />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <InputField label="Phone number *" value={form.phone} onChange={(v) => setValue("phone", v)} />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-800">Gender *</label>
                  <select className="input" value={form.gender} onChange={(e) => setValue("gender", e.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-800">Country *</label>
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

              <div className="grid gap-5 md:grid-cols-3">
                <InputField label="City" value={form.city} onChange={(v) => setValue("city", v)} />
                <InputField label="Zipcode" value={form.zipcode} onChange={(v) => setValue("zipcode", v)} />
                <InputField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setValue("dateOfBirth", v)} />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <InputField label="Raised in" value={form.raisedIn} onChange={(v) => setValue("raisedIn", v)} />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-800">Profile managed by</label>
                  <select className="input" value={form.profileManagedBy} onChange={(e) => setValue("profileManagedBy", e.target.value)}>
                    {PROFILE_MANAGED_BY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === "career" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <InputField label="Occupation" value={form.occupation} onChange={(v) => setValue("occupation", v)} />
                <InputField label="Career" value={form.career} onChange={(v) => setValue("career", v)} />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <InputField label="Education" value={form.education} onChange={(v) => setValue("education", v)} />
                <InputField label="Height (cm)" type="number" value={form.heightCm} onChange={(v) => setValue("heightCm", v)} />
                <InputField label="Salary" value={form.salary} onChange={(v) => setValue("salary", v)} />
              </div>
              <InputField label="Visa status" value={form.visaStatus} onChange={(v) => setValue("visaStatus", v)} />
              <TextAreaField label="About" value={form.about} onChange={(v) => setValue("about", v)} />
              <TextAreaField label="Looking for / Expectations" value={form.lookingFor} onChange={(v) => setValue("lookingFor", v)} />
            </div>
          )}

          {currentStep === "family" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <InputField label="Father name" value={form.fatherName} onChange={(v) => setValue("fatherName", v)} />
                <InputField label="Mother name" value={form.motherName} onChange={(v) => setValue("motherName", v)} />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-800">Siblings</label>
                  <select className="input" value={form.siblings} onChange={(e) => setValue("siblings", e.target.value)}>
                    {SIBLING_OPTIONS.map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                </div>
                <InputField label="Father occupation" value={form.fatherOccupation} onChange={(v) => setValue("fatherOccupation", v)} />
                <InputField label="Mother occupation" value={form.motherOccupation} onChange={(v) => setValue("motherOccupation", v)} />
              </div>

              {(form.siblings === "0" || form.siblings === "1") ? (
                <InputField label="Sibling occupation" value={form.siblingsOccupation} onChange={(v) => setValue("siblingsOccupation", v)} />
              ) : (
                <TextAreaField
                  label="Siblings details"
                  value={form.siblingsDetails}
                  onChange={(v) => setValue("siblingsDetails", v)}
                  placeholder="One sibling per line with occupation"
                />
              )}

              <div className="grid gap-5 md:grid-cols-3">
                <InputField label="Gotra" value={form.gotra} onChange={(v) => setValue("gotra", v)} />
                <InputField label="Grandfather name" value={form.grandfatherName} onChange={(v) => setValue("grandfatherName", v)} />
                <InputField label="Grandmother name" value={form.grandmotherName} onChange={(v) => setValue("grandmotherName", v)} />
              </div>
            </div>
          )}

          {currentStep === "prompts" && (
            <div className="space-y-4">
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
          )}
        </div>

        {currentStep !== "account" && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-outline" onClick={prevStep} disabled={stepIndex === 0 || busy}>Back</button>
            {currentStep !== "prompts" ? (
              <button type="button" className="btn-primary" onClick={nextStep} disabled={busy}>Next</button>
            ) : (
              <button type="button" className="btn-primary" onClick={onFinalizeProfile} disabled={busy}>
                {busy ? "Creating profile..." : "Create profile"}
              </button>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="font-semibold text-pink-700 hover:underline">Log in</Link>
        </p>

        {msg && <p className="mt-4 text-sm font-semibold text-rose-600">{msg}</p>}
      </div>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-pink-800">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-pink-800">{label}</label>
      <textarea className="input min-h-24" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
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
