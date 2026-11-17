"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase";
import { AvatarCropper } from "@/components/profile/AvatarCropper";
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
  const [location, setLocation] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
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
      setLocation(p?.location ?? "");
      setAvatarPreview(p?.avatar_url ?? null);
      setLoading(false);
    })();
  }, [router]);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropped = async (blob: Blob) => {
    if (!userId) return;
    setCropSrc(null);
    setUploading(true);
    setAvatarPreview(URL.createObjectURL(blob));

    try {
      const url = await uploadAvatar(userId, blob);
      setAvatarPreview(url);
    } catch {
      setError("Couldn't upload photo. Please try again.");
      setAvatarPreview(profile?.avatar_url ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
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
        location: location.trim() || null,
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
      <div className="app-surface h-full w-full">
        <StatusBar />
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-surface h-full w-full flex flex-col">
        <StatusBar />

        {/* Header bar */}
        <div className="frosted-header flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button onClick={() => router.back()} className="glass pressable px-4 py-2 rounded-full text-body font-medium" style={{ color: "var(--color-gray-1)" }}>
            Cancel
          </button>
          <h1 className="text-title font-bold">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="pressable px-4 py-2 rounded-full text-body font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--color-blue)", boxShadow: "0 4px 14px rgba(0,122,255,0.3)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-md mx-auto px-4 pt-4 pb-8 space-y-4">
            {/* Avatar hero — glass card with sheen. */}
            <div className="glass-card glass-sheen rounded-[28px] px-5 py-8 flex flex-col items-center">
              <button onClick={handlePickPhoto} className="relative pressable" disabled={uploading} aria-label="Change photo">
                <div className="rounded-full p-1" style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 8px 24px rgba(0,122,255,0.18)" }}>
                  <div className="rounded-full ring-4 ring-white/80">
                    <Avatar name={fullName || "?"} src={avatarPreview} size={112} />
                  </div>
                </div>
                <div
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center border-[3px] border-white"
                  style={{ background: "var(--color-blue)", boxShadow: "0 4px 12px rgba(0,122,255,0.35)" }}
                >
                  {uploading ? (
                    <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} />
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
              <button onClick={handlePickPhoto} className="text-body font-semibold mt-4" style={{ color: "var(--color-blue)" }}>
                Change Photo
              </button>
              <p className="text-caption mt-1" style={{ color: "var(--color-gray-1)" }}>Images up to 5MB</p>
            </div>

            {error && (
              <div className="glass-card px-4 py-3.5 rounded-[20px] text-body font-medium" style={{ background: "rgba(255,59,48,0.12)", color: "var(--color-red)" }}>
                {error}
              </div>
            )}

            {/* Identity fields */}
            <div className="glass-card rounded-[24px] overflow-hidden">
              <Field label="Name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={50}
                  placeholder="Your name"
                  className="glass-input flex-1 text-body outline-none px-4 py-2.5 rounded-full text-right min-w-0"
                />
              </Field>
              <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
              <Field label="Username" readOnly>
                <span className="flex-1 text-body text-right truncate" style={{ color: "var(--color-gray-1)" }}>
                  @{profile?.username}
                </span>
              </Field>
            </div>

            {/* Bio */}
            <div className="glass-card rounded-[24px] p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-caption font-semibold uppercase tracking-wide" style={{ color: "var(--color-gray-1)" }}>Bio</label>
                <span className="text-caption" style={{ color: "var(--color-gray-1)" }}>
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
                placeholder="Tell people a little about yourself"
                rows={3}
                className="w-full text-body outline-none bg-transparent resize-none leading-relaxed"
              />
            </div>

            {/* Location */}
            <div className="glass-card rounded-[24px] p-5">
              <label className="text-caption font-semibold uppercase tracking-wide block mb-2" style={{ color: "var(--color-gray-1)" }}>Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={60}
                placeholder="City, Country"
                className="w-full text-body outline-none bg-transparent"
              />
            </div>

            {/* Bottom save — thumb-reachable, same action as the header. */}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="pressable w-full py-3.5 rounded-full text-body font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--color-blue)", boxShadow: "0 6px 20px rgba(0,122,255,0.35)" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCropped={handleCropped}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}

function Field({ label, children, readOnly }: { label: string; children: React.ReactNode; readOnly?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-4 ${readOnly ? "opacity-70" : ""}`}
    >
      <label className="text-body font-medium flex-shrink-0">{label}</label>
      {children}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
