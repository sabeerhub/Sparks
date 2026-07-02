"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
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
    <ScreenContainer>
      <div className="flex-1 flex flex-col px-6 pt-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--color-blue)" }}>
            <BoltIcon />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-gray-1)" }}>Log in to continue to Sparks</p>
        </div>

        {verified && (
          <div className="rounded-2xl px-4 py-3 mb-5 text-sm font-medium" style={{ background: "rgba(52,199,89,0.12)", color: "var(--color-green)" }}>
            ✓ Email verified — you can now log in.
          </div>
        )}

        <div className="space-y-3">
          <Input
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            autoCapitalize="none"
            autoCorrect="off"
            error={error ?? undefined}
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
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
        </div>

        <div className="flex items-center justify-between mt-4 mb-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--color-blue)" }}
            />
            <span style={{ color: "var(--color-gray-1)" }}>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm font-medium" style={{ color: "var(--color-blue)" }}>
            Forgot password?
          </Link>
        </div>

        <Button fullWidth loading={loading} onClick={handleSignIn}>Log In</Button>

        <p className="text-sm text-center mt-6" style={{ color: "var(--color-gray-1)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold" style={{ color: "var(--color-blue)" }}>
            Create Account
          </Link>
        </p>
      </div>
    </ScreenContainer>
  );
}

function BoltIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
