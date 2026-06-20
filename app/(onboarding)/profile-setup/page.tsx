"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { isValidUsername } from "@/utils/helpers";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { createProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!fullName.trim()) return setError("Full name is required");
    if (!isValidUsername(username)) return setError("Username must be 3-24 lowercase letters, numbers, or underscores");

    setError(null);
    setLoading(true);
    try {
      await createProfile({ username: username.toLowerCase(), fullName: fullName.trim(), bio: bio.trim() || undefined });
      router.push("/chats");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile — username may already be taken");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex-1 overflow-y-auto px-6 pt-4">
        <h2 className="text-2xl font-bold mb-1">Create Your Profile</h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-gray-1)" }}>Add a few details to get started</p>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar name={fullName || "?"} size={96} />
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white" style={{ background: "var(--color-blue)" }} aria-label="Upload avatar">
              <CameraIcon />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Input label="Full Name" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} />
          <Input label="Bio (optional)" placeholder="Hello! I'm using Sparks." value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        {error && <p className="text-sm mt-3" style={{ color: "var(--color-red)" }}>{error}</p>}
      </div>
      <div className="px-6 pb-8 pt-4">
        <Button fullWidth loading={loading} onClick={handleContinue}>Continue</Button>
      </div>
    </ScreenContainer>
  );
}

function CameraIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
