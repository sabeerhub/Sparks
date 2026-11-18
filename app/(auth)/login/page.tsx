"use client";

/**
 * app/(auth)/login/page.tsx
 * v1.12.0 — same fields, same logic, same error handling as v1.11.0,
 * reordered to Instagram's layout so login feels like the same family
 * as the new step-by-step signup: inputs → Log In button → a small
 * centred "Forgot password?" link → OR divider → a quiet Remember me
 * row → the "Don't have an account? Create Account" footer card.
 * Nothing about signing in changed — only the order and the spacing.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verified =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("verified") === "1";

  const handleSignIn = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) { setError("Enter your email or username."); return; }
    if (!password) { setError("Enter your password."); return; }
    setError(null);
    setLoading(true);
    try {
      await signIn(trimmed, password);
      router.push("/chats");
    } catch (err) {
      let message = "Invalid email/username or password.";
      if (err && typeof err === "object" && "message" in err) {
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
      title="Welcome back"
      subtitle="Log in to continue"
      footer={
        <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="pressable font-semibold" style={{ color: "var(--color-blue)" }}>
            Create Account
          </Link>
        </p>
      }
    >
      {verified && (
        <div className="rounded-xl px-4 py-3 mb-5 text-body font-medium" style={{ color: "var(--color-green)", background: "rgba(52,199,89,0.12)" }}>
          ✓ Email verified — you can now log in.
        </div>
      )}

      <div className="space-y-3">
        <Input
          variant="auth"
          placeholder="Email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <div className="relative">
          <Input
            variant="auth"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
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
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-body" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-red)" }}>
          <p className="font-medium">{error}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>
            Double-check your details, or{" "}
            <Link href="/forgot-password" className="font-semibold" style={{ color: "var(--color-blue)" }}>
              reset your password
            </Link>
            .
          </p>
        </div>
      )}

      <Button fullWidth shape="rounded" loading={loading} onClick={handleSignIn} className="mt-5">Log In</Button>

      {/* Instagram puts "Forgot password?" as a small centred link right
          under the button — it was buried in a row with Remember me before. */}
      <div className="text-center mt-4">
        <Link href="/forgot-password" className="pressable text-caption font-medium" style={{ color: "var(--color-blue)" }}>
          Forgot password?
        </Link>
      </div>

      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <div className="h-px flex-1" style={{ background: "var(--hairline)" }} />
        <span className="text-caption font-semibold" style={{ color: "var(--color-gray-1)" }}>OR</span>
        <div className="h-px flex-1" style={{ background: "var(--hairline)" }} />
      </div>

      {/* Remember me stays — it is existing behaviour, just quieter now,
          centred under the divider instead of sharing a row. */}
      <div className="flex justify-center">
        <label className="flex items-center gap-2 text-caption cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--color-blue)" }}
          />
          <span style={{ color: "var(--color-gray-1)" }}>Remember me</span>
        </label>
      </div>
    </AuthShell>
  );
}
