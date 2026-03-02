import Link from "next/link";
import { HOME_FEATURES } from "@/lib/siteContent";

const MUST_HAVE_FEATURES = [
  "ID + selfie verification badges in feed and profile view",
  "Mutual-like chat unlock with unmatch and block controls",
  "Privacy-first phone visibility settings",
  "Profile completion tracking with unlock thresholds",
  "Location-priority matching with filters",
  "Prompt-based personality cards",
];

export default function FeaturesPage() {
  return (
    <main className="section mt-10 mb-14 space-y-8">
      <section className="card-soft p-8 md:p-12">
        <h1 className="text-4xl font-extrabold text-pink-800">Features</h1>
        <p className="mt-3 text-lg text-slate-700">
          Built as a blend of modern swipe experience and serious matrimony depth.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {HOME_FEATURES.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-pink-100 bg-white/85 p-7 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-xl font-bold text-white">
              {item.icon}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{item.title}</h2>
            <p className="mt-3 text-lg text-slate-600">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card-dotted p-8">
        <h2 className="text-2xl font-extrabold text-pink-800">Must-have Matrimony Features Added</h2>
        <ul className="mt-4 space-y-3 text-slate-700">
          {MUST_HAVE_FEATURES.map((item) => (
            <li key={item} className="rounded-xl border border-pink-100 bg-white px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/how-it-works" className="btn-outline">See How It Works</Link>
        <Link href="/faq" className="btn-primary">Open FAQ</Link>
      </div>
    </main>
  );
}
