"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase";
import { uploadAvatar } from "@/services/chat-service";
import { updateOwnProfile } from "@/services/chat-service";
import type { Profile } from "@/types";

const supabase = createClient();
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_BIO_LENGTH = 150;

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const p = data as Profile | null;
      setProfile(p);
      setFullName(p?.full_name ?? "");
      setBio(p?.bio ?? "");
      setAvatarPreview(p?.avatar_url ?? null);
      setLoading(false);
    })();
  }, [router]);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError("");
    setUploading(true);
    // Instant local preview while the real upload happens in the background.
    setAvatarPreview(URL.createObjectURL(file));

    try {
      const url = await uploadAvatar(userId, file);
      setAvatarPreview(url);
    } catch {
      setError("Couldn't upload photo. Please try again.");
      setAvatarPreview(profile?.avatar_url ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await updateOwnProfile(userId, {
        full_name: fullName.trim(),
        bio: bio.trim() || null,
      });
      router.push("/profile");
    } catch {
      setError("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <StatusBar />
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: "var(--color-gray-2)" }}>
          <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: "var(--color-gray-1)" }}>
            Cancel
          </button>
          <h1 className="text-base font-semibold">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="text-sm font-semibold disabled:opacity-40"
            style={{ color: "var(--color-blue)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Avatar */}
          <div className="flex flex-col items-center py-8 bg-white">
            <button onClick={handlePickPhoto} className="relative active:opacity-70 transition-opacity" disabled={uploading}>
              <Avatar name={fullName || "?"} src={avatarPreview} size={96} />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: "var(--color-blue)" }}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} />
                ) : (
                  <CameraIcon />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button onClick={handlePickPhoto} className="text-sm font-medium mt-3" style={{ color: "var(--color-blue)" }}>
              Change Photo
            </button>
          </div>

          {error && (
            <p className="text-xs text-center mt-3 px-6" style={{ color: "var(--color-red)" }}>
              {error}
            </p>
          )}

          {/* Fields */}
          <div className="px-4 pt-6 space-y-3">
            <div className="rounded-2xl bg-white overflow-hidden">
              <Field label="Name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  className="flex-1 text-sm outline-none bg-transparent text-right"
                />
              </Field>
              <Field label="Username" last={false} readOnly>
                <span className="flex-1 text-sm text-right" style={{ color: "var(--color-gray-1)" }}>
                  @{profile?.username}
                </span>
              </Field>
            </div>

            <div className="rounded-2xl bg-white overflow-hidden p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Bio</label>
                <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                placeholder="Tell people a little about yourself"
                rows={3}
                className="w-full text-sm outline-none bg-transparent resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function Field({ label, children, last, readOnly }: { label: string; children: React.ReactNode; last?: boolean; readOnly?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 ${last ? "" : "border-b"} ${readOnly ? "opacity-70" : ""}`}
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <label className="text-sm font-medium flex-shrink-0 mr-3">{label}</label>
      {children}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
