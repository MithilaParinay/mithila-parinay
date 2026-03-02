import Link from "next/link";
import { JOURNEY_STEPS } from "@/lib/siteContent";

const FLOW_DETAILS = [
  {
    title: "1. Create account and profile",
    text: "Register with email/password, add mandatory profile basics, upload photos, and set prompts.",
  },
  {
    title: "2. Complete profile to 75%",
    text: "If profile completion is below 75%, user is auto-redirected to complete profile before feed access.",
  },
  {
    title: "3. Discover and filter matches",
    text: "Use radius/location, age, height, raised in, education, and career filters in feed.",
  },
  {
    title: "4. Like/reject with undo",
    text: "Like or reject from feed and profile pages. Undo latest reject from feed when needed.",
  },
  {
    title: "5. Mutual like unlocks chat",
    text: "Both users liking each other creates a match and opens Messages with block/unmatch controls.",
  },
  {
    title: "6. Verification signals trust",
    text: "ID + selfie verification status appears as badges directly on cards and full profiles.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="section mt-10 mb-14 space-y-8">
      <section className="card-soft p-8 md:p-12">
        <h1 className="text-4xl font-extrabold text-pink-800">How It Works</h1>
        <p className="mt-3 text-lg text-slate-700">
          A guided flow designed for trusted introductions and meaningful conversations.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {JOURNEY_STEPS.map((step, idx) => (
          <article key={step.title} className="rounded-[28px] border border-pink-100 bg-white/85 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-lg font-bold text-white">
              {idx + 1}
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-slate-900">{step.title}</h2>
            <p className="mt-3 text-lg text-slate-600">{step.text}</p>
          </article>
        ))}
      </section>

      <section className="card-dotted p-8">
        <h2 className="text-2xl font-extrabold text-pink-800">Detailed Flow</h2>
        <div className="mt-5 space-y-4">
          {FLOW_DETAILS.map((item) => (
            <article key={item.title} className="rounded-xl border border-pink-100 bg-white p-4">
              <h3 className="text-lg font-extrabold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-slate-700">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/features" className="btn-outline">Explore Features</Link>
        <Link href="/faq" className="btn-primary">Read FAQ</Link>
      </div>
    </main>
  );
}
