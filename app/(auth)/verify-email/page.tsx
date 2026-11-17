"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { resendVerificationEmail } = useAuth();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      await resendVerificationEmail(email);
      setResent(true);
    } catch (err) {
      let message = "Could not resend. Try again in a moment.";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message: unknown }).message;
        if (typeof m === "string" && m) message = m;
      }
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="glass w-20 h-20 rounded-[28px] flex items-center justify-center mb-5">
          <MailIcon />
        </div>
        <p className="text-body leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
          We sent a verification link to
        </p>
        {email && <p className="text-body font-semibold mt-1 mb-2">{email}</p>}
        <p className="text-body leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
          Click the link in the email to verify your account, then come back to log in.
          No email yet? Check spam, then resend.
        </p>
      </div>
      {resent && (
        <div className="glass rounded-2xl px-4 py-3 mt-5 text-body font-medium w-full" style={{ color: "var(--color-green)" }}>
          ✓ Verification email resent.
        </div>
      )}
      {error && (
        <p className="text-body mt-4 font-medium text-center" style={{ color: "var(--color-red)" }}>{error}</p>
      )}
      <Button variant="secondary" fullWidth loading={resending} onClick={handleResend} className="mt-6">
        Resend verification email
      </Button>
      <button onClick={() => router.push("/login")} className="pressable mt-4 w-full text-body font-medium" style={{ color: "var(--color-blue)" }}>
        Back to Log In
      </button>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Check your inbox" subtitle="One last step before you can log in">
      <Suspense fallback={
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-blue)" }} />
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}

function MailIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
