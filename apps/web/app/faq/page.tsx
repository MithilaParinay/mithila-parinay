import FAQAccordion from "@/components/faqAccordion";
import { FULL_FAQS } from "@/lib/siteContent";

export default function FAQPage() {
  return (
    <main className="section mt-10 mb-14 space-y-8">
      <section className="card-soft p-8 md:p-12">
        <h1 className="text-4xl font-extrabold text-pink-800">Frequently Asked Questions</h1>
        <p className="mt-3 text-lg text-slate-700">
          Click any question to expand. Opening one question closes the previous one.
        </p>
      </section>

      <section className="card-dotted p-8">
        <FAQAccordion items={FULL_FAQS} />
      </section>
    </main>
  );
}
