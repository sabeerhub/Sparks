"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
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
    <ScreenContainer>
      <div className="flex-1 flex flex-col px-6 pt-10">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Avatar name={fullName || "You"} size={72} />
          </div>
          <h1 className="text-2xl font-bold mb-1">Set up your profile</h1>
          <p className="text-sm text-center" style={{ color: "var(--color-gray-1)" }}>
            Tell people a bit about yourself
          </p>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={error ?? undefined}
          />
          <Input
            placeholder="Bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <Button fullWidth loading={loading} onClick={handleContinue} className="mt-6">
          Continue to Sparks
        </Button>
      </div>
    </ScreenContainer>
  );
}
