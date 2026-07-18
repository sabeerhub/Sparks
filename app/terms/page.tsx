import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Spark Chat",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm font-medium text-[#007AFF]">← Back</Link>

        <h1 className="text-3xl font-bold mt-6 mb-2 text-[#1D1D1F]">Terms of Service</h1>
        <p className="text-sm text-[#1D1D1F]/50 mb-8">Last updated: July 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-[#1D1D1F]/80">
          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using Spark Chat, you agree to these Terms of Service and our Privacy Policy. If you don&apos;t agree, please don&apos;t use the app.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use Spark Chat. By creating an account, you confirm that you meet this requirement and that the information you provide is accurate.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">3. Your Account</h2>
            <p>You&apos;re responsible for keeping your password secure and for all activity under your account. Notify us immediately if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">4. Acceptable Use</h2>
            <p className="mb-2">You agree not to use Spark Chat to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Harass, threaten, or abuse other users</li>
              <li>Send spam, malware, or unsolicited advertising</li>
              <li>Impersonate another person or entity</li>
              <li>Share content that is illegal, hateful, or exploitative</li>
              <li>Attempt to access other users&apos; accounts or data without authorization</li>
              <li>Interfere with or disrupt the service or its infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">5. Content Responsibility</h2>
            <p>You retain ownership of the messages and media you send. You&apos;re solely responsible for the content you share and for having the right to share it. We may remove content or suspend accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">6. Sparks and Virtual Points</h2>
            <p>Spark points earned through app activity have no monetary value, cannot be exchanged for cash, and may be adjusted or reset if we detect abuse of the system.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">7. Calls</h2>
            <p>Voice and video calls connect directly between users&apos; devices. You&apos;re responsible for having consent from the other participant before recording any call, in accordance with applicable law in your location.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">8. Termination</h2>
            <p>You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms, at our discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">9. Disclaimer of Warranties</h2>
            <p>Spark Chat is provided "as is." We don&apos;t guarantee the service will be uninterrupted, error-free, or completely secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Spark Chat is not liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">11. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the app after changes means you accept the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">12. Contact</h2>
            <p>Questions about these Terms? Reach us at <a href="mailto:support@sparkschat.app" className="text-[#007AFF]">support@sparkschat.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
