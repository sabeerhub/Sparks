"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export default function ProfileSetupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from("profiles") as any)
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      router.push("/chats");
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

  return (
    <AuthShell
      title="Set up your profile"
      subtitle="Tell people a bit about yourself"
    >
      <div className="flex justify-center mb-6">
        <div className="glass rounded-full p-1.5">
          <Avatar name={fullName || "You"} size={72} />
        </div>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          placeholder="Bio (optional)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-2xl px-4 py-3 mt-4 text-body" style={{ background: "rgba(255,59,48,0.08)", color: "var(--color-red)" }}>
          <p className="font-medium">{error}</p>
          <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>
            Check your connection and try again — your details aren&apos;t lost.
          </p>
        </div>
      )}

      <Button fullWidth loading={loading} onClick={handleContinue} className="mt-6">
        Continue to Sparks
      </Button>
    </AuthShell>
  );
}
