"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
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
      <AuthShell
        title="Check your email"
        subtitle="We sent a password reset link"
        footer={
          <button onClick={() => router.push("/login")} className="pressable text-caption font-medium" style={{ color: "var(--color-blue)" }}>
            Back to Log In
          </button>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: "var(--color-blue-light)" }}>
            <MailIcon />
          </div>
          <p className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
            We sent a password reset link to
          </p>
          <p className="text-caption font-semibold mt-1 mb-2">{email}</p>
          <p className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
            Click the link in the email to reset your password. The link expires in 1 hour.
            Didn&apos;t get it? Check spam, then try again.
          </p>
          <Button variant="secondary" fullWidth shape="rounded" onClick={() => setSent(false)} className="mt-6">
            Try a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a link to reset your password."
      footer={
        <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
          Remembered it?{" "}
          <Link href="/login" className="pressable font-semibold" style={{ color: "var(--color-blue)" }}>
            Log In
          </Link>
        </p>
      }
    >
      <button onClick={() => router.push("/login")} className="pressable flex items-center gap-1 text-caption font-medium mb-5" style={{ color: "var(--color-blue)" }} aria-label="Back to log in">
        <BackIcon /> Back
      </button>

      <Input
        variant="auth"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoCapitalize="none"
      />

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-body" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-red)" }}>
          <p className="font-medium">{error}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>
            Check the address and try again, or contact support.
          </p>
        </div>
      )}

      <Button fullWidth shape="rounded" loading={loading} onClick={handleSubmit} className="mt-4">
        Send Reset Link
      </Button>
    </AuthShell>
  );
}

function BackIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function MailIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
