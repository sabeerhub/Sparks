"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { isValidEmail } from "@/utils/helpers";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) { setError("Enter a valid email address."); return; }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      let message = "Something went wrong. Please try again.";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message: unknown }).message;
        if (typeof m === "string" && m) message = m;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScreenContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(0,122,255,0.1)" }}>
            <MailIcon />
          </div>
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--color-gray-1)" }}>
            We sent a password reset link to
          </p>
          <p className="text-sm font-semibold mb-6">{email}</p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-gray-1)" }}>
            Click the link in the email to reset your password. The link expires in 1 hour.
          </p>
          <button onClick={() => router.push("/login")} className="text-sm font-medium" style={{ color: "var(--color-blue)" }}>
            Back to Log In
          </button>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex-1 flex flex-col px-6 pt-10">
        <button onClick={() => router.push("/login")} className="self-start mb-8" aria-label="Back">
          <BackIcon />
        </button>

        <h1 className="text-2xl font-bold mb-2">Forgot password?</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-gray-1)" }}>
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          error={error ?? undefined}
          autoCapitalize="none"
        />

        <Button fullWidth loading={loading} onClick={handleSubmit} className="mt-4">
          Send Reset Link
        </Button>

        <p className="text-sm text-center mt-6" style={{ color: "var(--color-gray-1)" }}>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--color-blue)" }}>
            Log In
          </Link>
        </p>
      </div>
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function MailIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

