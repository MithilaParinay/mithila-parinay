"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FAQAccordion from "@/components/faqAccordion";
import { getMyProfile } from "@/lib/matrimony";
import { calculateCompletion } from "@/lib/profileCompletion";
import { HOME_FEATURES, HOME_FAQS, JOURNEY_STEPS } from "@/lib/siteContent";

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile();
        const completion = calculateCompletion(profile);

        if (!profile || completion < 75) {
          router.replace("/complete-profile");
          return;
        }

        router.replace("/feed");
      } catch {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  if (checkingAuth) {
    return <main className="section mt-12 text-sm text-slate-500">Loading...</main>;
  }

  return (
    <main className="pb-16">
      <section className="section mt-10">
        <div className="card-soft p-8 md:p-14">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            Find your <span className="text-pink-600">perfect match</span>
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
            Where Mithila tradition meets modern technology. Discover verified Maithil
            profiles curated for your family values, culture and preferences.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn-primary text-lg">Get Started Free</Link>
            <Link href="/login" className="btn-outline text-lg">Already a member? Log in</Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-6 text-sm font-semibold text-slate-600">
            <span>Verified profiles</span>
            <span>Privacy first</span>
            <span>Built for the Maithili community</span>
          </div>
        </div>
      </section>

      <section id="features" className="section mt-14">
        <h2 className="text-center text-4xl font-extrabold text-pink-800">The Mithila Parinay Experience</h2>
        <p className="mt-3 text-center text-xl text-slate-600">
          Built for Maithil families blending cultural roots with technology.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {HOME_FEATURES.map((item) => (
            <article key={item.title} className="rounded-[28px] border border-pink-100 bg-white/80 p-7 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-xl font-bold text-white">
                {item.icon}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-lg text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section mt-14 rounded-[30px] border border-pink-100 bg-white/85 p-8 md:p-12">
        <h2 className="text-center text-4xl font-extrabold text-pink-800">Our Impact in Numbers</h2>
        <p className="mt-3 text-center text-xl text-slate-600">
          Trusted by Maithil families worldwide and building bridges across generations.
        </p>

        <div className="mt-10 grid gap-6 text-center md:grid-cols-3">
          <div>
            <div className="mx-auto inline-flex rounded-2xl bg-pink-500 px-7 py-3 text-2xl font-extrabold text-white">50+</div>
            <div className="mt-3 text-xl font-bold text-slate-800">Countries</div>
          </div>
          <div>
            <div className="mx-auto inline-flex rounded-2xl bg-pink-500 px-7 py-3 text-2xl font-extrabold text-white">100%</div>
            <div className="mt-3 text-xl font-bold text-slate-800">Verified Profiles Goal</div>
          </div>
          <div>
            <div className="mx-auto inline-flex rounded-2xl bg-pink-500 px-7 py-3 text-2xl font-extrabold text-white">24/7</div>
            <div className="mt-3 text-xl font-bold text-slate-800">Support</div>
          </div>
        </div>
      </section>

      <section id="how" className="section mt-14">
        <h2 className="text-center text-4xl font-extrabold text-pink-800">Your Journey to Love</h2>
        <p className="mt-3 text-center text-xl text-slate-600">
          A simple, guided 3-step process to find your life partner.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {JOURNEY_STEPS.map((step, idx) => (
            <article key={step.title} className="rounded-[28px] border border-pink-100 bg-white/80 p-8 text-center shadow-sm">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-lg font-bold text-white">
                {idx + 1}
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-900">{step.title}</h3>
              <p className="mt-3 text-lg text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="section mt-14 rounded-[30px] border border-pink-100 bg-white/85 p-8 md:p-12">
        <h2 className="text-4xl font-extrabold text-pink-800">Frequently Asked Questions</h2>
        <FAQAccordion items={HOME_FAQS} />
      </section>

      <footer className="section mt-14 rounded-[30px] border border-pink-100 bg-white/85 px-7 py-8 text-slate-700">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-extrabold text-slate-800">Mithila Parinay - A Mithila Matrimony</p>
            <p className="mt-2 max-w-2xl text-lg">
              Connecting hearts within the Mithila community, one match at a time while
              respecting tradition and embracing technology.
            </p>
          </div>

          <div className="text-right text-lg text-slate-600">
            <p>Made for the Maithili community.</p>
            <p className="mt-1">Copyright 2026 Mithila Parinay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
