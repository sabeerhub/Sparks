"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Share2, Pencil, ShieldCheck, Bookmark, Settings, LayoutGrid, User, Image as ImageIcon } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { TikTokProfileHeader } from "@/components/profile/TikTokProfileHeader";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount, openSavedMessages } from "@/services/chat-service";
import { getRecentMediaThumbnails, getMediaUrl } from "@/services/media-service";
import type { Profile } from "@/types";

const supabase = createClient();

type Tab = "media" | "about";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center pt-6 px-4">
      <div className="w-[112px] h-[112px] rounded-full animate-pulse mb-4" style={{ background: "var(--color-gray-3)" }} />
      <div className="h-5 w-36 rounded-full mb-2 animate-pulse" style={{ background: "var(--color-gray-3)" }} />
      <div className="h-4 w-24 rounded-full animate-pulse" style={{ background: "var(--color-gray-3)" }} />
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
  const [tab, setTab] = useState<Tab>("media");

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

      const thumbs = await getRecentMediaThumbnails(9);
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

      {/* Top bar — TikTok style: back left, @username centred, actions right. */}
      <div className="flex items-center justify-between px-4 pt-3 relative z-10 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft size={22} color="var(--color-blue)" strokeWidth={2} />
        </button>
        <span className="text-body font-semibold truncate" style={{ color: "#1D1D1F" }}>
          @{profile?.username ?? ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Share profile"
          >
            <Share2 size={18} color="var(--color-blue)" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => router.push("/profile/edit")}
            className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="Edit profile"
          >
            <Pencil size={18} color="var(--color-blue)" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        {loading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <div className="w-full max-w-[640px] mx-auto pb-24">
            <TikTokProfileHeader
              name={profile.full_name ?? "—"}
              username={profile.username}
              verified={profile.is_verified}
              premium={profile.is_premium}
              avatarUrl={profile.avatar_url}
              online
              bio={profile.bio}
              location={profile.location}
              joinedLabel={formatJoinDate(profile.created_at)}
              stats={[
                { value: (profile.spark_count ?? 0).toLocaleString(), label: "Total Sparks" },
                { value: sparkConnections.toLocaleString(), label: "Connections" },
                { value: String(daysActive(profile.created_at)), label: "Days Active" },
              ]}
              actions={
                <div className="flex gap-3 px-4">
                  <button
                    onClick={() => router.push("/profile/edit")}
                    className="glass pressable flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-body font-semibold"
                    style={{ color: "#1D1D1F" }}
                  >
                    <Pencil size={16} strokeWidth={1.8} /> Edit profile
                  </button>
                  <button
                    onClick={() => setShareOpen(true)}
                    className="pressable flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-body font-semibold text-white"
                    style={{ background: "#007AFF", boxShadow: "0 6px 20px rgba(0,122,255,0.35)" }}
                  >
                    <Share2 size={16} strokeWidth={2} /> Share profile
                  </button>
                </div>
              }
            />

            {/* Tab bar — TikTok style: icon tabs, active = blue underline. */}
            <div
              className="flex mt-6 sticky top-0 z-10"
              style={{ background: "rgba(245,245,247,0.85)", backdropFilter: "blur(24px) saturate(180%)" }}
            >
              <TabButton
                active={tab === "media"}
                onClick={() => setTab("media")}
                icon={<LayoutGrid size={19} strokeWidth={1.8} />}
                label="Media"
              />
              <TabButton
                active={tab === "about"}
                onClick={() => setTab("about")}
                icon={<User size={19} strokeWidth={1.8} />}
                label="About"
              />
            </div>

            {tab === "media" ? (
              <div className="px-0.5 pt-0.5">
                {mediaThumbs.length > 0 ? (
                  <>
                    <div className="flex items-center justify-end px-3 py-2">
                      <button
                        onClick={() => router.push("/profile/media")}
                        className="pressable flex items-center gap-0.5 text-caption font-medium"
                        style={{ color: "#007AFF" }}
                      >
                        View all <ChevronRight size={14} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-[2px]">
                      {mediaThumbs.map((url) => (
                        <button
                          key={url}
                          onClick={() => router.push("/profile/media")}
                          className="pressable overflow-hidden rounded-[10px] bg-white/60"
                          aria-label="Open shared media"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            className="w-full object-cover"
                            style={{ aspectRatio: "3 / 4" }}
                            onError={() => setMediaThumbs((prev) => prev.filter((u) => u !== url))}
                          />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-12 px-4 text-center">
                    <div className="glass w-14 h-14 rounded-full flex items-center justify-center mb-3">
                      <ImageIcon size={22} color="#C7C7CC" strokeWidth={1.5} />
                    </div>
                    <p className="text-body font-medium" style={{ color: "#1D1D1F" }}>No shared media yet</p>
                    <p className="text-caption mt-1" style={{ color: "#6E6E73" }}>Photos you share in chats will appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 pt-4 space-y-3">
                <div className="glass-card rounded-[24px] p-5">
                  <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: "#6E6E73" }}>About</span>
                  <p className="text-body mt-2 leading-relaxed" style={{ color: "#1D1D1F" }}>
                    {profile.bio || "No bio yet — add one from Edit profile."}
                  </p>
                </div>
                <div className="glass-card rounded-[24px] overflow-hidden">
                  <AboutRow label="Username" value={`@${profile.username}`} />
                  <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
                  <AboutRow label="Joined" value={formatJoinDate(profile.created_at)} />
                  {profile.location && (
                    <>
                      <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
                      <AboutRow label="Location" value={profile.location} />
                    </>
                  )}
                  <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
                  <AboutRow label="Days active" value={String(daysActive(profile.created_at))} />
                </div>
              </div>
            )}

            {/* More — account navigation, kept below the content. */}
            <div className="px-4 pt-5">
              <div className="glass-card rounded-[24px] overflow-hidden">
                <SettingsRow icon={ShieldCheck} label="Security Center" desc="Manage your account security" onClick={() => router.push("/settings/security")} />
                <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
                <SettingsRow icon={Bookmark} label="Saved Messages" desc="Messages you saved" onClick={handleMessageSelf} />
                <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />
                <SettingsRow icon={Settings} label="Settings" desc="Account, privacy, notifications" onClick={() => router.push("/settings")} last />
              </div>
              <div className="flex justify-center pt-4">
                <button onClick={handleLogout} className="pressable px-5 py-2.5 text-body font-semibold rounded-full" style={{ color: "#FF3B30" }}>
                  Log Out
                </button>
              </div>
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

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable flex-1 flex items-center justify-center gap-1.5 py-3 relative"
      aria-selected={active}
      role="tab"
    >
      <span style={{ color: active ? "#1D1D1F" : "#8E8E93" }}>{icon}</span>
      <span
        className="text-caption font-semibold"
        style={{ color: active ? "#1D1D1F" : "#8E8E93" }}
      >
        {label}
      </span>
      {active && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-12 rounded-full"
          style={{ background: "#007AFF" }}
        />
      )}
    </button>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-body" style={{ color: "#6E6E73" }}>{label}</span>
      <span className="text-body font-medium text-right truncate" style={{ color: "#1D1D1F" }}>{value}</span>
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
