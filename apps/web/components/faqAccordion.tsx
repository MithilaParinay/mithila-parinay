"use client";

import { useState } from "react";
import { HOME_FAQS } from "@/lib/siteContent";

type FAQItem = { q: string; a: string };

export default function FAQAccordion({ items = HOME_FAQS }: { items?: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number>(-1);

  return (
    <div className="mt-8 space-y-4">
      {items.map((item, idx) => {
        const open = openIndex === idx;
        const label = `${String(idx + 1).padStart(2, "0")}) ${item.q}`;

        return (
          <div key={item.q} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <button
              className="flex w-full items-center justify-between px-6 py-5 text-left text-lg font-semibold text-slate-800"
              onClick={() => setOpenIndex(open ? -1 : idx)}
              aria-expanded={open}
            >
              <span>{label}</span>
              <span className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-base">
                {open ? "-" : "+"}
              </span>
            </button>

            {open && (
              <div className="border-t border-slate-200 bg-white px-6 py-4 text-sm leading-6 text-slate-600">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
