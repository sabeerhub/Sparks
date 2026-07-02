"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import { isValidEmail } from "@/utils/helpers";

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

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
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
  );
}

type UsernameStatusType = ReturnType<typeof useUsernameAvailability>;

function UsernameStatus({ status }: { status: UsernameStatusType }) {
  if (status === "checking") return <p className="text-xs mt-1" style={{ color: "var(--color-gray-1)" }}>Checking…</p>;
  if (status === "available") return <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-green)" }}>✓ Username available</p>;
  if (status === "taken") return <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-red)" }}>Username already taken</p>;
  if (status === "invalid") return <p className="text-xs mt-1" style={{ color: "var(--color-gray-1)" }}>3–24 chars, letters/numbers/underscores only</p>;
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameStatus = useUsernameAvailability(username);

  const handleSignUp = async () => {
    if (!fullName.trim()) { setError("Enter your full name."); return; }
    if (!username.trim()) { setError("Choose a username."); return; }
    if (usernameStatus === "taken") { setError("That username is already taken."); return; }
    if (usernameStatus === "invalid") { setError("Username must be 3–24 characters, letters/numbers/underscores only."); return; }
    if (usernameStatus === "checking") { setError("Wait for the username check to finish."); return; }
    if (!isValidEmail(email)) { setError("Enter a valid email address."); return; }
    if (getPasswordStrength(password) < 2) { setError("Password is too weak — use at least 8 characters with uppercase, lowercase, and a number."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    if (!agreedToTerms) { setError("Please agree to the Terms of Service."); return; }

    setError(null);
    setLoading(true);
    try {
      const { emailConfirmationRequired } = await signUp({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
      });
      if (emailConfirmationRequired) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else {
        router.push("/chats");
      }

} catch (err) {
      const parts: string[] = [];
      parts.push(`typeof: ${typeof err}`);
      parts.push(`String: ${String(err)}`);
      if (err && typeof err === "object") {
        const obj = err as Record<string, unknown>;
        for (const key of ["message", "name", "status", "code", "__isAuthError"]) {
          if (key in obj) parts.push(`${key}: ${JSON.stringify(obj[key])}`);
        }
      }
      setError(parts.join(" | "));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 overflow-y-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--color-blue)" }}>
            <BoltIcon />
          </div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-gray-1)" }}>Join Sparks — it&apos;s free</p>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div>
            <Input
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <UsernameStatus status={usernameStatus} />
          </div>

          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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
            <PasswordStrengthBar password={password} />
          </div>

          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm mt-3 font-medium" style={{ color: "var(--color-red)" }}>{error}</p>
        )}

        <label className="flex items-start gap-3 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
            style={{ accentColor: "var(--color-blue)" }}
          />
          <span className="text-sm" style={{ color: "var(--color-gray-1)" }}>
            I agree to the{" "}
            <span style={{ color: "var(--color-blue)" }}>Terms of Service</span> and{" "}
            <span style={{ color: "var(--color-blue)" }}>Privacy Policy</span>
          </span>
        </label>

        <Button fullWidth loading={loading} onClick={handleSignUp} className="mt-5">
          Create Account
        </Button>

        <p className="text-sm text-center mt-5" style={{ color: "var(--color-gray-1)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--color-blue)" }}>
            Log In
          </Link>
        </p>
      </div>
    </ScreenContainer>
  );
}

function BoltIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
