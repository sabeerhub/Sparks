"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Zap, Calendar, MapPin, MoreHorizontal, ImageIcon, Star, ShieldCheck, Bookmark, Settings, ChevronRight } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount } from "@/services/chat-service";
import type { Profile } from "@/types";

const supabase = createClient();

function ProfileSkeleton() {
  return (
    <div className="animate-pulse flex flex-col items-center pt-10">
      <div className="w-24 h-24 rounded-full mb-4" style={{ background: "#F5F5F7" }} />
      <div className="h-5 w-36 rounded-full mb-2" style={{ background: "#F5F5F7" }} />
      <div className="h-4 w-24 rounded-full" style={{ background: "#F5F5F7" }} />
    </div>
  );
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
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <StatusBar />

      {/* Minimal nav */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <div className="w-9" />
        <span className="text-[15px] font-semibold" style={{ color: "#1D1D1F" }}>Profile</span>
        <button
          onClick={() => setShareOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "#F5F5F7" }}
          aria-label="More"
        >
          <MoreHorizontal size={18} color="#1D1D1F" strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <div className="w-full max-w-md mx-auto px-6">
            {/* Identity */}
            <div className="flex flex-col items-center pt-6 pb-8 text-center">
              <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={100} />

              <div className="flex items-center gap-1.5 mt-5">
                <h1 className="text-[22px] font-semibold" style={{ color: "#1D1D1F" }}>{profile.full_name ?? "—"}</h1>
                {profile.is_verified && <BadgeCheck size={17} fill="#007AFF" color="white" />}
              </div>

              <p className="text-[15px] mt-0.5" style={{ color: "#007AFF" }}>
                @{profile.username}{profile.is_premium && " 💎"}
              </p>

              {profile.bio && (
                <p className="text-[14px] mt-3 max-w-xs leading-relaxed" style={{ color: "#1D1D1F" }}>{profile.bio}</p>
              )}

              <div className="flex items-center gap-2.5 mt-4 text-[13px]" style={{ color: "#6E6E73" }}>
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

            {/* Stats */}
            <div className="flex items-stretch justify-around py-5" style={{ borderTop: "1px solid #F5F5F7", borderBottom: "1px solid #F5F5F7" }}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <Zap size={16} color="#007AFF" fill="#007AFF" />
                <span className="text-[19px] font-semibold" style={{ color: "#1D1D1F" }}>{(profile.spark_count ?? 0).toLocaleString()}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Total Sparks</span>
              </div>
              <div style={{ width: 1, background: "#E5E5EA" }} />
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[16px]">👥</span>
                <span className="text-[19px] font-semibold" style={{ color: "#1D1D1F" }}>{sparkConnections.toLocaleString()}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Spark Connections</span>
              </div>
              <div style={{ width: 1, background: "#E5E5EA" }} />
              <div className="flex flex-col items-center gap-1 flex-1">
                <Calendar size={16} color="#007AFF" strokeWidth={1.8} />
                <span className="text-[19px] font-semibold" style={{ color: "#1D1D1F" }}>{formatJoinDate(profile.created_at).split(" ")[0]}</span>
                <span className="text-[12px]" style={{ color: "#6E6E73" }}>Joined</span>
              </div>
            </div>

            {/* Primary actions */}
            <div className="flex gap-3 py-5">
              <button
                onClick={() => router.push("/profile/edit")}
                className="flex-1 py-3 rounded-full text-[15px] font-medium border transition-transform active:scale-[0.98]"
                style={{ borderColor: "#E5E5EA", color: "#1D1D1F" }}
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="flex-1 py-3 rounded-full text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
                style={{ background: "#007AFF" }}
              >
                Share Profile
              </button>
            </div>

            {/* Media */}
            <div className="py-5" style={{ borderTop: "1px solid #F5F5F7" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[15px] font-semibold" style={{ color: "#1D1D1F" }}>Media</span>
                <button onClick={() => router.push("/profile/media")} className="text-[13px]" style={{ color: "#6E6E73" }}>
                  View all
                </button>
              </div>
              <div className="flex flex-col items-center py-8 text-center">
                <ImageIcon size={26} color="#E5E5EA" strokeWidth={1.5} />
                <p className="text-[13px] mt-2" style={{ color: "#6E6E73" }}>No shared media yet</p>
              </div>
            </div>

            {/* Settings list */}
            <div className="py-2" style={{ borderTop: "1px solid #F5F5F7" }}>
              <SettingsRow icon={Star} label="Spark Premium" onClick={() => {}} />
              <SettingsRow icon={Bookmark} label="Saved Messages" onClick={() => {}} />
              <SettingsRow icon={ShieldCheck} label="Security Center" onClick={() => router.push("/settings/security")} />
              <SettingsRow icon={Settings} label="Settings" onClick={() => router.push("/settings")} last />
            </div>

            {/* Logout */}
            <div className="flex justify-center py-8">
              <button onClick={handleLogout} className="text-[14px] font-medium" style={{ color: "#FF3B30" }}>
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden">
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
  icon: Icon, label, onClick, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; onClick: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5"
      style={{ borderBottom: last ? "none" : "1px solid #F5F5F7" }}
    >
      <Icon size={18} color="#6E6E73" strokeWidth={1.6} />
      <span className="flex-1 text-[15px] text-left" style={{ color: "#1D1D1F" }}>{label}</span>
      <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.8} />
    </button>
  );
}
