"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
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
      <p className="text-caption font-medium" style={{ color: STRENGTH_COLORS[strength] }}>
        {STRENGTH_LABELS[strength]}
      </p>
    </div>
  );
}

type UsernameStatusType = ReturnType<typeof useUsernameAvailability>;

function UsernameStatus({ status }: { status: UsernameStatusType }) {
  if (status === "checking") return <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>Checking…</p>;
  if (status === "available") return <p className="text-caption mt-1 font-medium" style={{ color: "var(--color-green)" }}>✓ Username available</p>;
  if (status === "taken") return <p className="text-caption mt-1 font-medium" style={{ color: "var(--color-red)" }}>Username already taken</p>;
  if (status === "invalid") return <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>3–24 chars, letters/numbers/underscores only</p>;
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
      let message = "Something went wrong. Please try again.";
      if (err && typeof err === "object" && "name" in err &&
        (err as { name: unknown }).name === "AuthRetryableFetchError") {
        message = "Could not connect to the server. Check your connection and try again.";
      } else if (err && typeof err === "object" && "message" in err) {
        const m = (err as { message: unknown }).message;
        if (typeof m === "string" && m) message = m;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Join Sparks — it's free"
      footer={
        <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
          Already have an account?{" "}
          <Link href="/login" className="pressable font-semibold" style={{ color: "var(--color-blue)" }}>
            Log In
          </Link>
        </p>
      }
    >
      <div className="space-y-3">
        <Input variant="auth" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <div>
          <Input
            variant="auth"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <UsernameStatus status={usernameStatus} />
        </div>
        <Input variant="auth" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
        <div>
          <div className="relative">
            <Input
              variant="auth"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="pressable absolute right-4 top-1/2 -translate-y-1/2 text-caption font-medium"
              style={{ color: "var(--color-blue)" }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <PasswordStrengthBar password={password} />
        </div>
        <Input
          variant="auth"
          type={showPassword ? "text" : "password"}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-body" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-red)" }}>
          <p className="font-medium">{error}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>
            Fix the detail above and try again — nothing is saved until it works.
          </p>
        </div>
      )}

      {/* v1.11.0 — the terms checkbox is a real gate, not decoration.
          The Sign Up button is disabled AND visibly blurred/greyed
          while the box is unticked, and handleSignUp also refuses to
          submit without it — there is no way through unticked. The
          Terms / Privacy Policy words link to the real /terms and
          /privacy pages in the app. */}
      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
          style={{ accentColor: "var(--color-blue)" }}
        />
        <span className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
          I agree to the{" "}
          <Link href="/terms" className="pressable" style={{ color: "var(--color-blue)" }}>Terms of Service</Link> and{" "}
          <Link href="/privacy" className="pressable" style={{ color: "var(--color-blue)" }}>Privacy Policy</Link>
        </span>
      </label>

      <Button
        fullWidth
        shape="rounded"
        loading={loading}
        disabled={!agreedToTerms}
        onClick={handleSignUp}
        className={agreedToTerms ? "mt-5" : "mt-5 grayscale blur-[1px]"}
      >
        Create Account
      </Button>
      {!agreedToTerms && (
        <p className="text-caption text-center mt-3" style={{ color: "var(--color-gray-1)" }}>
          Tick the box above to agree to the Terms and continue.
        </p>
      )}
    </AuthShell>
  );
}
