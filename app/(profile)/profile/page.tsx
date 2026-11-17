"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, BadgeCheck, Calendar, MapPin, QrCode, Share2, MessageCircle, Users, Image as ImageIcon, ShieldCheck, Bookmark, Settings, ChevronRight, MoreHorizontal } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount, openSavedMessages } from "@/services/chat-service";
import { getRecentMediaThumbnails, getMediaUrl } from "@/services/media-service";
import type { Profile } from "@/types";

const supabase = createClient();

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <div className="glass-card glass-sheen rounded-[28px] w-full max-w-md px-5 py-8 flex flex-col items-center animate-pulse">
        <div className="w-[104px] h-[104px] rounded-full mb-4" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-5 w-36 rounded-full mb-2" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-4 w-24 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
    </div>
  );
}

function daysActive(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  return Math.max(1, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
}

function formatJoinDate(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sparkConnections, setSparkConnections] = useState(0);
  const [mediaThumbs, setMediaThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
      getSparkConnectionsCount(user.id).then(setSparkConnections);

      const thumbs = await getRecentMediaThumbnails(4);
      const urls = await Promise.all(thumbs.map((t) => getMediaUrl(t.mediaPath)));
      setMediaThumbs(urls.filter((u): u is string => !!u));

      setLoading(false);
    })();
  }, [router]);

  const handleMessageSelf = async () => {
    const chatId = await openSavedMessages();
    router.push(`/chats/${chatId}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="app-surface h-full w-full flex flex-col overflow-hidden relative">
      <StatusBar />

      <div className="flex items-center justify-between px-4 pt-4 relative z-10 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft size={22} color="var(--color-blue)" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Share profile"
          >
            <QrCode size={18} color="var(--color-blue)" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => router.push("/profile/edit")}
            className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Edit profile"
          >
            <MoreHorizontal size={19} color="var(--color-blue)" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        {loading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <div className="w-full max-w-md mx-auto px-4 pt-4 pb-8 space-y-4">
            {/* Hero — glass identity card with sheen. */}
            <div className="glass-card glass-sheen rounded-[28px] px-5 pt-8 pb-6 flex flex-col items-center text-center">
              <div
                className="rounded-full p-1 mb-4"
                style={{
                  background: profile.is_premium ? "var(--color-blue)" : "rgba(255,255,255,0.9)",
                  boxShadow: "0 8px 24px rgba(0,122,255,0.18)",
                }}
              >
                <div className="rounded-full ring-4 ring-white/80">
                  <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={112} online />
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h1 className="text-title font-bold" style={{ color: "#1D1D1F", fontSize: 26, lineHeight: "32px" }}>{profile.full_name ?? "—"}</h1>
                {profile.is_verified && <BadgeCheck size={19} fill="#007AFF" color="white" />}
              </div>
              {profile.is_premium && (
                <span className="mt-2 px-3 py-1 rounded-full text-caption font-bold" style={{ background: "rgba(0,122,255,0.12)", color: "var(--color-blue)" }}>
                  Premium
                </span>
              )}

              <p className="text-body mt-1" style={{ color: "#6E6E73" }}>@{profile.username}</p>

              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {profile.location && (
                  <span className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium" style={{ color: "#1D1D1F" }}>
                    <MapPin size={12} strokeWidth={1.8} /> {profile.location}
                  </span>
                )}
                <span className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium" style={{ color: "#1D1D1F" }}>
                  <Calendar size={12} strokeWidth={1.8} /> Joined {formatJoinDate(profile.created_at)}
                </span>
              </div>
            </div>

            {/* Stats — three glass tiles, real numbers only. */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-[20px] px-2 py-4 flex flex-col items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#007AFF" }} />
                <span className="text-title font-bold" style={{ color: "#1D1D1F" }}>{(profile.spark_count ?? 0).toLocaleString()}</span>
                <span className="text-caption text-center leading-tight" style={{ color: "#6E6E73" }}>Total Sparks</span>
              </div>
              <div className="glass-card rounded-[20px] px-2 py-4 flex flex-col items-center gap-1">
                <Users size={17} color="#007AFF" strokeWidth={1.8} />
                <span className="text-title font-bold" style={{ color: "#1D1D1F" }}>{sparkConnections.toLocaleString()}</span>
                <span className="text-caption text-center leading-tight" style={{ color: "#6E6E73" }}>Connections</span>
              </div>
              <div className="glass-card rounded-[20px] px-2 py-4 flex flex-col items-center gap-1">
                <Calendar size={17} color="#007AFF" strokeWidth={1.8} />
                <span className="text-title font-bold" style={{ color: "#1D1D1F" }}>{daysActive(profile.created_at)}</span>
                <span className="text-caption text-center leading-tight" style={{ color: "#6E6E73" }}>Days Active</span>
              </div>
            </div>

            {/* Primary actions */}
            <div className="flex gap-3">
              <button
                onClick={handleMessageSelf}
                className="glass pressable flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-body font-semibold"
                style={{ color: "#1D1D1F" }}
              >
                <MessageCircle size={17} strokeWidth={1.8} /> Message
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="pressable flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-full text-body font-semibold text-white"
                style={{ background: "#007AFF", boxShadow: "0 6px 20px rgba(0,122,255,0.35)" }}
              >
                <Share2 size={17} strokeWidth={2} /> Get Spark
              </button>
            </div>

            {/* About */}
            {profile.bio && (
              <div className="glass-card rounded-[24px] p-5">
                <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: "#6E6E73" }}>About</span>
                <p className="text-body mt-2 leading-relaxed" style={{ color: "#1D1D1F" }}>{profile.bio}</p>
              </div>
            )}

            {/* Media */}
            <div className="glass-card rounded-[24px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-body font-semibold" style={{ color: "#1D1D1F" }}>Media</span>
                <button onClick={() => router.push("/profile/media")} className="pressable flex items-center gap-0.5 text-caption font-medium" style={{ color: "#007AFF" }}>
                  View all <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>
              {mediaThumbs.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {mediaThumbs.map((url) => (
                    <div key={url} className="glass rounded-2xl overflow-hidden p-[3px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" loading="lazy" className="w-full object-cover rounded-xl" style={{ aspectRatio: "1 / 1" }} onError={() => setMediaThumbs((prev) => prev.filter((u) => u !== url))} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="glass w-14 h-14 rounded-full flex items-center justify-center mb-3">
                    <ImageIcon size={22} color="#C7C7CC" strokeWidth={1.5} />
                  </div>
                  <p className="text-body font-medium" style={{ color: "#1D1D1F" }}>No shared media yet</p>
                  <p className="text-caption mt-1" style={{ color: "#6E6E73" }}>Photos you share in chats will appear here.</p>
                </div>
              )}
            </div>

            {/* Settings list */}
            <div className="glass-card rounded-[24px] overflow-hidden">
              <SettingsRow icon={ShieldCheck} label="Security Center" desc="Manage your account security" onClick={() => router.push("/settings/security")} />
              <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
              <SettingsRow icon={Bookmark} label="Saved Messages" desc="Messages you saved" onClick={handleMessageSelf} />
              <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
              <SettingsRow icon={Settings} label="Settings" desc="Account, privacy, notifications" onClick={() => router.push("/settings")} last />
            </div>

            {/* Logout */}
            <div className="flex justify-center pt-2">
              <button onClick={handleLogout} className="pressable px-5 py-2.5 text-body font-semibold rounded-full" style={{ color: "#FF3B30" }}>
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden relative z-10">
        <BottomNav />
      </div>

      {profile && (
        <ShareProfileSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          userId={profile.id}
          username={profile.username}
        />
      )}
    </div>
  );
}

function SettingsRow({
  icon: Icon, label, desc, onClick, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; desc: string; onClick: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable w-full flex items-center gap-3 px-4 py-4 text-left"
    >
      <div className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
        <Icon size={19} color="#007AFF" strokeWidth={1.8} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-body font-medium" style={{ color: "#1D1D1F" }}>{label}</div>
        <div className="text-caption truncate mt-0.5" style={{ color: "#6E6E73" }}>{desc}</div>
      </div>
      <ChevronRight size={17} color="#C7C7CC" strokeWidth={1.8} />
    </button>
  );
}
