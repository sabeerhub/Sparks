import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Spark Chat",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm font-medium text-[#007AFF]">← Back</Link>

        <h1 className="text-3xl font-bold mt-6 mb-2 text-[#1D1D1F]">Privacy Policy</h1>
        <p className="text-sm text-[#1D1D1F]/50 mb-8">Last updated: July 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-[#1D1D1F]/80">
          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy explains what information Spark Chat ("we," "our," "the app") collects, how
              it&apos;s used, and the choices you have. By using Spark Chat, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">2. Information We Collect</h2>
            <p className="mb-2"><strong>Account information:</strong> your email address, username, full name, and password (stored securely by our authentication provider, never in plain text).</p>
            <p className="mb-2"><strong>Profile information:</strong> anything you choose to add — avatar, bio, and location.</p>
            <p className="mb-2"><strong>Messages and media:</strong> text messages, images, files, and voice notes you send are stored on our servers so they can be delivered and kept in your chat history.</p>
            <p className="mb-2"><strong>Device and session data:</strong> browser type, operating system, device type, and an approximate location (city/country, derived from IP address) each time you sign in, so you can manage which devices are logged in.</p>
            <p><strong>Usage data:</strong> Spark connections, Spark point activity, notification preferences, and call metadata (who called whom, call type, and duration — not call audio/video content itself).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">3. How We Protect Your Data</h2>
            <p className="mb-2">
              All data in transit is protected with HTTPS/TLS encryption. Data at rest in our database is encrypted
              by our infrastructure provider. Access to your data is restricted using row-level security policies,
              meaning our database itself enforces that you can only read data you&apos;re authorized to see.
            </p>
            <p>
              <strong>Important:</strong> messages are currently stored in a readable (not end-to-end encrypted)
              form on our servers, protected by the safeguards above. This means that, in principle, we could
              access message content if required for security, legal, or support purposes. We do not read your
              messages as a matter of routine. Voice and video calls connect directly between participants&apos;
              devices (peer-to-peer) and are not recorded or stored by us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">4. How We Use Your Information</h2>
            <p>We use your information to: provide and operate the messaging service; show your profile to other users per your privacy settings; send notifications you&apos;ve opted into; maintain account security and detect abuse; and improve the app&apos;s reliability and features.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">5. Sharing Your Information</h2>
            <p>
              We do not sell your personal data. Information is shared only with: other users, according to what
              your profile and privacy settings make visible; service providers who help operate the app
              (our hosting, database, and authentication infrastructure); and authorities, if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">6. Your Choices and Controls</h2>
            <p>
              Within the app&apos;s Settings, you can control who sees your last-seen time, online status, read
              receipts, typing indicator, and profile visibility; choose who can send you Spark Requests; block
              other users; manage notification preferences; download a copy of your data; and permanently delete
              your account, which removes your profile, messages you&apos;ve sent, and related data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">7. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active. If you delete your account, your
              profile and associated data are permanently removed, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">8. Children&apos;s Privacy</h2>
            <p>Spark Chat is not directed at children under 13, and we do not knowingly collect information from them.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">9. Changes to This Policy</h2>
            <p>We may update this policy as the app evolves. We&apos;ll update the date at the top of this page when changes are made.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">10. Contact Us</h2>
            <p>Questions about this policy? Reach us at <a href="mailto:support@sparkschat.app" className="text-[#007AFF]">support@sparkschat.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
