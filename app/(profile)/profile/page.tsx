"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, BadgeCheck, Zap, Calendar, MapPin, QrCode, Share2, MessageCircle, Users, Quote, Image as ImageIcon, ShieldCheck, Bookmark, Settings, ChevronRight, MoreHorizontal } from "lucide-react";
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
    <div className="animate-pulse flex flex-col items-center pt-16">
      <div className="w-24 h-24 rounded-full mb-4" style={{ background: "#F5F5F7" }} />
      <div className="h-5 w-36 rounded-full mb-2" style={{ background: "#F5F5F7" }} />
      <div className="h-4 w-24 rounded-full" style={{ background: "#F5F5F7" }} />
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
    <div className="h-full w-full flex flex-col bg-white overflow-hidden relative">
      <StatusBar />

      {/* Top gradient strip + curved white hill overlapping it */}
      <div
        className="absolute top-0 left-0 right-0 h-80 pointer-events-none"
        style={{ background: "linear-gradient(180deg, #CFE4FF 0%, #E8F2FF 60%, #F5FAFF 100%)" }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: 300,
          left: "-25%",
          width: "150%",
          height: 600,
          background: "#FFFFFF",
          borderRadius: "50% 50% 0 0 / 90px 90px 0 0",
        }}
      />

      <div className="flex items-center justify-between px-5 pt-4 relative z-10 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          aria-label="Back"
        >
          <ChevronLeft size={20} color="#1D1D1F" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShareOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            aria-label="QR Code"
          >
            <QrCode size={17} color="#1D1D1F" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => router.push("/profile/edit")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            aria-label="More"
          >
            <MoreHorizontal size={18} color="#1D1D1F" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        {loading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <div className="w-full max-w-md mx-auto px-5">
            {/* Identity */}
            <div className="flex flex-col items-center pt-2 pb-6 text-center">
              <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={104} online />

              <div className="flex items-center gap-1.5 mt-4">
                <h1 className="text-[21px] font-bold" style={{ color: "#1D1D1F" }}>{profile.full_name ?? "—"}</h1>
                {profile.is_verified && <BadgeCheck size={17} fill="#007AFF" color="white" />}
                {profile.is_premium && <span className="text-base">💎</span>}
              </div>

              <p className="text-[14px] mt-0.5" style={{ color: "#6E6E73" }}>@{profile.username}</p>

              {profile.bio && (
                <p className="text-[15px] mt-3" style={{ color: "#1D1D1F" }}>{profile.bio}</p>
              )}

              <div className="flex items-center gap-2.5 mt-3 text-[13px]" style={{ color: "#6E6E73" }}>
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} strokeWidth={1.8} /> {profile.location}
                  </span>
                )}
                {profile.location && <span style={{ color: "#E5E5EA" }}>|</span>}
                <span className="flex items-center gap-1">
                  <Calendar size={12} strokeWidth={1.8} /> Joined {formatJoinDate(profile.created_at)}
                </span>
              </div>
            </div>

            {/* Stats card */}
            <div
              className="flex items-stretch justify-around py-5 rounded-3xl bg-white mb-4"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
            >
              <div className="flex flex-col items-center gap-1 flex-1">
                <Zap size={17} color="#007AFF" fill="#007AFF" />
                <span className="text-[19px] font-bold" style={{ color: "#1D1D1F" }}>{(profile.spark_count ?? 0).toLocaleString()}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Total Sparks</span>
              </div>
              <div style={{ width: 1, background: "#E5E5EA" }} />
              <div className="flex flex-col items-center gap-1 flex-1">
                <Users size={17} color="#007AFF" strokeWidth={1.8} />
                <span className="text-[19px] font-bold" style={{ color: "#1D1D1F" }}>{sparkConnections.toLocaleString()}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Spark Connections</span>
              </div>
              <div style={{ width: 1, background: "#E5E5EA" }} />
              <div className="flex flex-col items-center gap-1 flex-1">
                <Calendar size={17} color="#007AFF" strokeWidth={1.8} />
                <span className="text-[19px] font-bold" style={{ color: "#1D1D1F" }}>{daysActive(profile.created_at)}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Days Active</span>
              </div>
            </div>

            {/* Primary actions */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleMessageSelf}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-[15px] font-medium border bg-white transition-transform active:scale-[0.98]"
                style={{ borderColor: "#E5E5EA", color: "#1D1D1F" }}
              >
                <MessageCircle size={16} strokeWidth={1.8} /> Message
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                style={{ background: "#007AFF" }}
              >
                <Share2 size={16} strokeWidth={2} /> Get Spark
              </button>
            </div>

            {/* About card */}
            {profile.bio && (
              <div className="relative rounded-2xl bg-white p-5 mb-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <span className="text-[15px] font-semibold" style={{ color: "#1D1D1F" }}>About</span>
                <p className="text-[14px] mt-2 leading-relaxed max-w-[85%]" style={{ color: "#6E6E73" }}>{profile.bio}</p>
                <Quote size={26} color="#E8F1FF" fill="#E8F1FF" className="absolute top-5 right-5" />
              </div>
            )}

            {/* Media */}
            <div className="rounded-2xl bg-white p-5 mb-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[15px] font-semibold" style={{ color: "#1D1D1F" }}>Media</span>
                <button onClick={() => router.push("/profile/media")} className="flex items-center gap-0.5 text-[13px]" style={{ color: "#6E6E73" }}>
                  View all <ChevronRight size={14} strokeWidth={1.8} />
                </button>
              </div>
              {mediaThumbs.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {mediaThumbs.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" loading="lazy" className="w-full object-cover rounded-xl" style={{ aspectRatio: "1 / 1" }} onError={() => setMediaThumbs((prev) => prev.filter((u) => u !== url))} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <ImageIcon size={24} color="#E5E5EA" strokeWidth={1.5} />
                  <p className="text-[13px] mt-2" style={{ color: "#6E6E73" }}>No shared media yet</p>
                </div>
              )}
            </div>

            {/* Settings list */}
            <div className="rounded-2xl bg-white overflow-hidden mb-6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <SettingsRow icon={ShieldCheck} label="Security Center" desc="Manage your account security" onClick={() => router.push("/settings/security")} />
              <SettingsRow icon={Bookmark} label="Saved Messages" desc="Messages you saved" onClick={handleMessageSelf} />
              <SettingsRow icon={Settings} label="Settings" desc="Account, privacy, notifications" onClick={() => router.push("/settings")} last />
            </div>

            {/* Logout */}
            <div className="flex justify-center pb-8">
              <button onClick={handleLogout} className="text-[14px] font-medium" style={{ color: "#FF3B30" }}>
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
      className="w-full flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? "none" : "1px solid #F5F5F7" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E8F1FF" }}>
        <Icon size={17} color="#007AFF" strokeWidth={1.8} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[14px] font-medium" style={{ color: "#1D1D1F" }}>{label}</div>
        <div className="text-[12px] truncate" style={{ color: "#6E6E73" }}>{desc}</div>
      </div>
      <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.8} />
    </button>
  );
}
