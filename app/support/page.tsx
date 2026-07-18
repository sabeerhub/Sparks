import Link from "next/link";

export const metadata = {
  title: "Support — Spark Chat",
};

const FAQS = [
  { q: "How do I connect with someone?", a: "Search for their username, open their profile, and send a Spark Request. Once they accept, you can start chatting." },
  { q: "How do Sparks (points) work?", a: "You earn Sparks for account milestones — like completing your profile or connecting with new people. Your Spark count is shown on your profile." },
  { q: "Can I control who sees my activity?", a: "Yes — under Settings → Privacy, you can control your last-seen visibility, online status, read receipts, typing indicator, and who can send you Spark Requests." },
  { q: "How do I delete my account?", a: "Go to Settings → Account → Delete Account. This permanently removes your profile and data and can't be undone." },
  { q: "Are my calls recorded?", a: "No. Voice and video calls connect directly between devices and are never recorded or stored by Spark Chat." },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm font-medium text-[#007AFF]">← Back</Link>

        <h1 className="text-3xl font-bold mt-6 mb-2 text-[#1D1D1F]">Support</h1>
        <p className="text-[15px] text-[#1D1D1F]/60 mb-8">
          Need help? Check the questions below, or email us directly at{" "}
          <a href="mailto:support@sparkschat.app" className="text-[#007AFF]">support@sparkschat.app</a>.
        </p>

        <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4">Frequently Asked Questions</h2>
        <div className="space-y-5">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-1">{faq.q}</h3>
              <p className="text-[15px] text-[#1D1D1F]/70 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-2xl" style={{ background: "#F5F5F7" }}>
          <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-1">Still need help?</h3>
          <p className="text-sm text-[#1D1D1F]/60 mb-3">Our team typically responds within 24 hours.</p>
          <a href="mailto:support@sparkschat.app" className="inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full" style={{ background: "#007AFF" }}>
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
