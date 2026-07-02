"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#FF3B30", "#FF9500", "#007AFF", "#34C759"];

export default function ResetPasswordPage() {
  const router = useRouter();
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const handleReset = async () => {
    if (strength < 2) { setError("Password is too weak — use at least 8 characters with uppercase, lowercase, and a number."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setError(null);
    setLoading(true);
    try {
      await confirmPasswordReset(password);
      setDone(true);
    } catch (err) {
      let message = "Could not reset password. Your link may have expired — request a new one.";
      if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message: unknown }).message;
        if (typeof m === "string" && m) message = m;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ScreenContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(52,199,89,0.1)" }}>
            <CheckIcon />
          </div>
          <h1 className="text-2xl font-bold mb-3">Password updated</h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-gray-1)" }}>
            Your password has been reset. You can now log in with your new password.
          </p>
          <Button fullWidth onClick={() => router.push("/login")}>Log In</Button>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex-1 flex flex-col px-6 pt-10">
        <h1 className="text-2xl font-bold mb-2">Create new password</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-gray-1)" }}>
          Choose a strong password for your account.
        </p>

        <div className="space-y-3">
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: "var(--color-blue)" }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full transition-all"
                      style={{ background: level <= strength ? STRENGTH_COLORS[strength] : "var(--color-gray-3)" }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium" style={{ color: STRENGTH_COLORS[strength] }}>
                  {STRENGTH_LABELS[strength]}
                </p>
              </div>
            )}
          </div>

          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm mt-3 font-medium" style={{ color: "var(--color-red)" }}>{error}</p>
        )}

        <Button fullWidth loading={loading} onClick={handleReset} className="mt-6">
          Reset Password
        </Button>
      </div>
    </ScreenContainer>
  );
}

function CheckIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
