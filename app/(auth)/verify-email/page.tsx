"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
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
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(0,122,255,0.1)" }}>
        <MailIcon />
      </div>
      <h1 className="text-2xl font-bold mb-3">Check your inbox</h1>
      <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--color-gray-1)" }}>
        We sent a verification link to
      </p>
      {email && <p className="text-sm font-semibold mb-4">{email}</p>}
      <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-gray-1)" }}>
        Click the link in the email to verify your account, then come back to log in.
      </p>
      {resent && (
        <div className="rounded-2xl px-4 py-3 mb-4 text-sm font-medium w-full" style={{ background: "rgba(52,199,89,0.12)", color: "var(--color-green)" }}>
          ✓ Verification email resent.
        </div>
      )}
      {error && <p className="text-sm mb-4 font-medium" style={{ color: "var(--color-red)" }}>{error}</p>}
      <Button variant="secondary" fullWidth loading={resending} onClick={handleResend}>
        Resend verification email
      </Button>
      <button onClick={() => router.push("/login")} className="mt-4 text-sm font-medium" style={{ color: "var(--color-blue)" }}>
        Back to Log In
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <ScreenContainer>
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-blue)" }} />
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </ScreenContainer>
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
