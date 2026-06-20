"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { isValidEmail } from "@/utils/helpers";

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email);
      sessionStorage.setItem("sparks_pending_email", email);
      router.push("/otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-4">
        <button onClick={() => router.push("/")} className="self-start mb-8" aria-label="Back">
          <BackIcon />
        </button>
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto" style={{ background: "var(--color-blue)" }}>
            <BoltIcon />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-sm text-center mb-8" style={{ color: "var(--color-gray-1)" }}>
            Log in to continue to Sparks
          </p>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              error={error ?? undefined}
            />
            <Button fullWidth loading={loading} onClick={handleContinue}>
              Continue
            </Button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--color-gray-3)" }} />
            <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-gray-3)" }} />
          </div>

          <Button variant="secondary" fullWidth onClick={signInWithGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <p className="text-xs text-center mt-6" style={{ color: "var(--color-gray-1)" }}>
            By continuing, you agree to our{" "}
            <span style={{ color: "var(--color-blue)" }}>Terms of Service</span> and{" "}
            <span style={{ color: "var(--color-blue)" }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function BoltIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09a7.07 7.07 0 010-4.18V7.07H2.18a11 11 0 000 9.86l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
