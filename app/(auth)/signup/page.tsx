"use client";

/**
 * app/(auth)/signup/page.tsx
 * v1.12.0 — Instagram-style step-by-step signup: one screen per step,
 * small quiet text, dots + "Step X of 5", back arrow that keeps everything
 * already typed (all step data lives in state at the top of this flow).
 *
 *   Step 1 — Full name + Email, Continue
 *   Step 2 — Date of birth (native date input: on a real phone it opens
 *            the OS date wheels, and its value is already ISO YYYY-MM-DD,
 *            exactly what the `date` column wants)
 *   Step 3 — Username with LIVE availability (debounced query against the
 *            real profiles table via is_username_available() — no fake
 *            timer, Continue is blocked until it is available)
 *   Step 4 — Password (+ confirm), show/hide eye, same strength rule
 *   Step 5 — Terms tick + Create account (the v1.11.0 gate, unchanged)
 *
 * The final submit is the same signUp call as before — same Supabase
 * calls, same redirects, same error messages. The date of birth is
 * stored in profiles.date_of_birth (migration 0008) in the same insert
 * that creates the profile row: if the column does not exist yet the
 * insert fails visibly and signup stops — the DOB is never silently
 * dropped. Run migration 0008 before this goes live.
 */

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
  return <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>3–24 chars, letters/numbers/underscores only</p>;
}

/** Date of birth rules: a real date, in the past, age 13 or older (Instagram's rule). */
function validateDob(value: string): string | null {
  if (!value) return "Enter your date of birth.";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Enter a real date.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() > today.getTime()) return "Your date of birth can't be in the future.";
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  if (age < 13) return "You must be at least 13 to use Sparks.";
  return null;
}

const STEP_TITLES = [
  "Create account",
  "When were you born?",
  "Choose a username",
  "Create a password",
  "Almost done",
];

const STEP_SUBTITLES = [
  "Enter your full name and email to start",
  "This won't show on your profile",
  "This is how people find you on Sparks",
  "Use at least 8 characters with uppercase, lowercase, and a number",
  "Agree to the Terms to finish",
];

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  // All step data lives here, at the top of the flow — going back never
  // loses anything already typed.
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameStatus = useUsernameAvailability(username);
  const todayISO = new Date().toISOString().slice(0, 10);

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim()) { setError("Enter your full name."); return; }
      if (!isValidEmail(email.trim())) { setError("Enter a valid email address."); return; }
      setStep(2);
    } else if (step === 2) {
      const dobError = validateDob(dob);
      if (dobError) { setError(dobError); return; }
      setStep(3);
    } else if (step === 3) {
      if (usernameStatus === "taken") { setError("That username is already taken."); return; }
      if (usernameStatus === "invalid") { setError("Username must be 3–24 characters, letters/numbers/underscores only."); return; }
      if (usernameStatus === "checking") { setError("Wait for the username check to finish."); return; }
      if (usernameStatus !== "available") { setError("Choose a username first."); return; }
      setStep(4);
    } else if (step === 4) {
      if (getPasswordStrength(password) < 2) { setError("Password is too weak — use at least 8 characters with uppercase, lowercase, and a number."); return; }
      if (password !== confirmPassword) { setError("Passwords don't match."); return; }
      setStep(5);
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSignUp = async () => {
    // Final guard: re-check every step before submitting, so there is no
    // way through with a missing or invalid detail.
    if (!fullName.trim()) { setError("Enter your full name."); return; }
    if (!isValidEmail(email.trim())) { setError("Enter a valid email address."); return; }
    const dobError = validateDob(dob);
    if (dobError) { setError(dobError); return; }
    if (usernameStatus !== "available") { setError("Choose an available username first."); return; }
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
        dateOfBirth: dob,
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
      title={STEP_TITLES[step - 1] ?? "Create account"}
      subtitle={STEP_SUBTITLES[step - 1] ?? ""}
      stepLabel={`Step ${step} of 5`}
      stepDots={{ current: step, total: 5 }}
      onBack={step > 1 ? goBack : undefined}
      footer={
        <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
          Already have an account?{" "}
          <Link href="/login" className="pressable font-semibold" style={{ color: "var(--color-blue)" }}>
            Log In
          </Link>
        </p>
      }
    >
      {/* ─── Step 1: full name + email ─── */}
      {step === 1 && (
        <div className="space-y-3">
          <Input
            variant="auth"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
          />
          <Input
            variant="auth"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      )}

      {/* ─── Step 2: date of birth ───
          Native date input: on a real phone it opens the OS date wheels,
          and its value is already ISO YYYY-MM-DD — exactly what the
          `date` column wants. Dark-mode picker follows color-scheme
          (see .auth-input in globals.css). */}
      {step === 2 && (
        <div className="space-y-3">
          <Input
            variant="auth"
            type="date"
            aria-label="Date of birth"
            value={dob}
            min="1900-01-01"
            max={todayISO}
            onChange={(e) => setDob(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
          />
          <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
            Tap the field to pick the date you were born.
          </p>
        </div>
      )}

      {/* ─── Step 3: username, live availability ─── */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <Input
              variant="auth"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <UsernameStatus status={usernameStatus} />
          </div>
        </div>
      )}

      {/* ─── Step 4: password ─── */}
      {step === 4 && (
        <div className="space-y-3">
          <div>
            <div className="relative">
              <Input
                variant="auth"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goNext()}
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
            onKeyDown={(e) => e.key === "Enter" && goNext()}
          />
        </div>
      )}

      {/* ─── Step 5: terms + create account ─── */}
      {step === 5 && (
        <div>
          <p className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
            You&apos;re signing up as <span className="font-semibold" style={{ color: "var(--color-black)" }}>{fullName.trim()}</span>{" "}
            (<span className="font-semibold" style={{ color: "var(--color-black)" }}>@{username.trim().toLowerCase()}</span>).
            Tap the back arrow above if anything needs changing.
          </p>
          {/* v1.11.0 terms gate, unchanged: the button is disabled AND
              visibly blurred/greyed while unticked, and handleSignUp
              also refuses to submit without it — no way through unticked. */}
          {/* v1.12.1 — ROOT CAUSE FIX: the Terms/Privacy links used to live
              INSIDE this <label>, so on a phone the tap fired the label's
              activation behaviour (toggle the checkbox) and never
              navigated — the words looked like links but did nothing.
              The links are now OUTSIDE any label, so a tap navigates;
              the plain "I agree to the" text keeps its own small label
              so tapping it still toggles the checkbox. The links also
              open in a new tab so the 5-step flow (and everything typed
              into it) stays alive underneath — navigating away would
              unmount the flow and lose it. */}
          <div className="flex items-start gap-3 mt-5">
            <input
              id="agree-terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded flex-shrink-0 cursor-pointer"
              style={{ accentColor: "var(--color-blue)" }}
            />
            <span className="text-caption leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
              <label htmlFor="agree-terms" className="cursor-pointer">I agree to the</label>{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="pressable" style={{ color: "var(--color-blue)" }}>Terms of Service</Link> and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="pressable" style={{ color: "var(--color-blue)" }}>Privacy Policy</Link>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-body" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-red)" }}>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {step < 5 ? (
        <Button
          fullWidth
          shape="rounded"
          onClick={goNext}
          disabled={step === 3 && usernameStatus !== "available"}
          className="mt-5"
        >
          Continue
        </Button>
      ) : (
        <>
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
        </>
      )}
    </AuthShell>
  );
}
