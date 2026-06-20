"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export default function OtpPage() {
  const router = useRouter();
  const { verifyOtp, sendOtp } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setEmail(sessionStorage.getItem("sparks_pending_email") ?? "");
  }, []);

  const handleChange = async (i: number, value: string) => {
    const digit = value.slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setError(null);

    if (digit && i < 5) refs.current[i + 1]?.focus();

    if (next.every((d) => d)) {
      setVerifying(true);
      try {
        const user = await verifyOtp(email, next.join(""));
        const { data } = await supabase.from("profiles").select("id").eq("id", user!.id).maybeSingle();
        router.push(data ? "/chats" : "/onboarding/welcome");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid code, try again");
        setOtp(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
      } finally {
        setVerifying(false);
      }
    }
  };

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-4">
        <button onClick={() => router.push("/login")} className="self-start mb-8" aria-label="Back">
          <BackIcon />
        </button>
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto" style={{ background: "var(--color-blue-light)" }}>
            <LockIcon />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Enter Code</h2>
          <p className="text-sm text-center mb-2" style={{ color: "var(--color-gray-1)" }}>We sent a 6-digit code to</p>
          <p className="text-sm font-semibold text-center mb-8">{email}</p>

          <div className="flex justify-center gap-2 mb-4">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                disabled={verifying}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()}
                className="w-11 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none"
                style={{
                  borderColor: d ? "var(--color-blue)" : "var(--color-gray-3)",
                  background: d ? "var(--color-blue-light)" : "var(--color-gray-2)",
                }}
                maxLength={1}
              />
            ))}
          </div>

          {error && <p className="text-sm text-center mb-4" style={{ color: "var(--color-red)" }}>{error}</p>}

          <p className="text-center mt-2 text-sm" style={{ color: "var(--color-gray-1)" }}>
            Didn&apos;t receive it?{" "}
            <button onClick={() => sendOtp(email)} className="font-medium" style={{ color: "var(--color-blue)" }}>
              Resend
            </button>
          </p>
        </div>
      </div>
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function LockIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
}
