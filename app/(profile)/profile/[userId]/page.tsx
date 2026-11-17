"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, BadgeCheck, MapPin, Share2, Pencil, Phone, Video, Users, Calendar } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { SparkRequestButton } from "@/components/spark/SparkRequestButton";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount, getNickname, setNickname } from "@/services/chat-service";
import { hasAcceptedSpark } from "@/services/spark-service";
import { useCallActions } from "@/components/call/CallProvider";
import type { Profile } from "@/types";

const supabase = createClient();

function formatJoinDate(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [sparkConnections, setSparkConnections] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canCall, setCanCall] = useState(false);
  const { placeCall } = useCallActions();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("profiles") as any)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setProfile(data as Profile | null);
    getSparkConnectionsCount(userId).then(setSparkConnections);
    hasAcceptedSpark(userId).then(setCanCall);
    if (user && user.id !== userId) {
      getNickname(userId).then(setNicknameState);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const isSelf = currentUserId === userId;

  const handleEditNickname = async () => {
    const next = window.prompt("Set a private nickname for this contact (only you will see it):", nickname ?? "");
    if (next === null) return; // cancelled
    await setNickname(userId, next);
    setNicknameState(next.trim() || null);
  };

  if (loading || !profile) {
    return (
      <div className="app-surface h-full w-full flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-surface h-full w-full flex flex-col overflow-hidden">
      <StatusBar />

      <div className="flex items-center px-4 pt-4 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft size={22} color="var(--color-blue)" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
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
                <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={112} online={profile.is_online} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h1 className="text-title font-bold" style={{ fontSize: 26, lineHeight: "32px" }}>{nickname || profile.full_name}</h1>
              {profile.is_verified && <BadgeCheck size={19} fill="var(--color-blue)" color="white" />}
              {!isSelf && (
                <button onClick={handleEditNickname} aria-label="Edit nickname" className="glass pressable w-7 h-7 rounded-full flex items-center justify-center ml-0.5">
                  <Pencil size={13} color="var(--color-gray-1)" strokeWidth={1.8} />
                </button>
              )}
            </div>
            {nickname && (
              <p className="text-body mt-1" style={{ color: "var(--color-gray-1)" }}>{profile.full_name}</p>
            )}
            {profile.is_premium && (
              <span className="mt-2 px-3 py-1 rounded-full text-caption font-bold" style={{ background: "rgba(0,122,255,0.12)", color: "var(--color-blue)" }}>
                Premium
              </span>
            )}
            <p className="text-body mt-1" style={{ color: "var(--color-gray-1)" }}>@{profile.username}</p>

            {profile.bio && (
              <p className="text-body mt-3 leading-relaxed" style={{ color: "var(--color-black)" }}>{profile.bio}</p>
            )}

            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {profile.location && (
                <span className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium">
                  <MapPin size={12} strokeWidth={1.8} /> {profile.location}
                </span>
              )}
              <span className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium">
                <Calendar size={12} strokeWidth={1.8} /> Joined {formatJoinDate(profile.created_at)}
              </span>
            </div>
          </div>

          {/* Stats — two glass tiles, real numbers only. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-[20px] px-2 py-4 flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-blue)" }} />
              <span className="text-title font-bold">{profile.spark_count?.toLocaleString() ?? 0}</span>
              <span className="text-caption text-center leading-tight" style={{ color: "var(--color-gray-1)" }}>Total Sparks</span>
            </div>
            <div className="glass-card rounded-[20px] px-2 py-4 flex flex-col items-center gap-1">
              <Users size={17} color="var(--color-blue)" strokeWidth={1.8} />
              <span className="text-title font-bold">{sparkConnections.toLocaleString()}</span>
              <span className="text-caption text-center leading-tight" style={{ color: "var(--color-gray-1)" }}>Connections</span>
            </div>
          </div>

          {/* Actions — one row, one height, one language. */}
          <div className="flex items-center gap-2.5">
            {currentUserId && !isSelf && (
              <div className="flex-1 min-w-0">
                <SparkRequestButton targetUserId={userId} currentUserId={currentUserId} />
              </div>
            )}
            {canCall && (
              <>
                <button
                  onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "voice")}
                  className="glass pressable w-[52px] h-[52px] flex items-center justify-center rounded-full flex-shrink-0"
                  aria-label="Voice call"
                >
                  <Phone size={20} color="var(--color-blue)" strokeWidth={1.8} />
                </button>
                <button
                  onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "video")}
                  className="glass pressable w-[52px] h-[52px] flex items-center justify-center rounded-full flex-shrink-0"
                  aria-label="Video call"
                >
                  <Video size={20} color="var(--color-blue)" strokeWidth={1.8} />
                </button>
              </>
            )}
            <button
              onClick={() => setShareOpen(true)}
              className="glass pressable h-[52px] px-5 flex items-center justify-center gap-1.5 rounded-full text-body font-semibold flex-shrink-0"
            >
              <Share2 size={17} color="var(--color-blue)" strokeWidth={1.8} /> Share
            </button>
          </div>
        </div>
      </div>

      <ShareProfileSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        userId={profile.id}
        username={profile.username}
      />
    </div>
  );
}
