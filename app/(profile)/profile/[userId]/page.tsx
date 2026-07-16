"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, MapPin, Share2, Pencil, Phone, Video, Zap, Users } from "lucide-react";
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
      <div className="h-full w-full flex items-center justify-center bg-white">
        <StatusBar />
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "var(--color-gray-2)" }}>
      <StatusBar />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full">
          <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
            <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: "var(--color-blue)" }}>
              Back
            </button>
          </div>

          {/* Banner + avatar */}
          <div className="relative">
            <div className="h-32 w-full" style={{ background: "linear-gradient(120deg, var(--color-blue), var(--color-orange))" }} />
            <div className="absolute left-5 bottom-0 translate-y-1/2">
              <div
                className="rounded-full p-1 bg-white"
                style={profile.is_premium ? { background: "linear-gradient(135deg, var(--color-orange), var(--color-blue))" } : undefined}
              >
                <div className="rounded-full ring-4 ring-white">
                  <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={88} online={profile.is_online} />
                </div>
              </div>
            </div>
          </div>

          {/* Identity block */}
          <div className="px-5 pt-14">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold">{nickname || profile.full_name}</h2>
              {profile.is_verified && <BadgeCheck size={18} fill="var(--color-blue)" color="white" />}
              {!isSelf && (
                <button onClick={handleEditNickname} aria-label="Edit nickname" className="ml-0.5 active:opacity-60">
                  <Pencil size={15} color="var(--color-gray-1)" strokeWidth={1.8} />
                </button>
              )}
            </div>
            {nickname && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>{profile.full_name}</p>
            )}
            <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm mt-3" style={{ color: "var(--color-black)" }}>{profile.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: "var(--color-gray-1)" }}>
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} strokeWidth={1.8} /> {profile.location}
                </span>
              )}
              <span>Joined {formatJoinDate(profile.created_at)}</span>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1">
                <Zap size={15} fill="var(--color-blue)" color="var(--color-blue)" />
                <span className="font-bold">{profile.spark_count?.toLocaleString() ?? 0}</span>
                <span style={{ color: "var(--color-gray-1)" }}>Total Sparks</span>
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} strokeWidth={1.8} color="var(--color-gray-1)" />
                <span className="font-bold">{sparkConnections.toLocaleString()}</span>
                <span style={{ color: "var(--color-gray-1)" }}>Spark Connections</span>
              </span>
            </div>

            {/* Action row: connection button (Send Spark / Pending / Accept-Decline / Message) + Share */}
            <div className="flex gap-2 mt-4 pb-6">
              {currentUserId && !isSelf && (
                <div className="flex-1">
                  <SparkRequestButton targetUserId={userId} currentUserId={currentUserId} />
                </div>
              )}
              {canCall && (
                <>
                  <button onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "voice")} className="w-11 h-11 flex items-center justify-center rounded-2xl border flex-shrink-0" style={{ borderColor: "var(--color-gray-3)" }} aria-label="Call">
                    <Phone size={18} color="var(--color-blue)" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "video")} className="w-11 h-11 flex items-center justify-center rounded-2xl border flex-shrink-0" style={{ borderColor: "var(--color-gray-3)" }} aria-label="Video call">
                    <Video size={18} color="var(--color-blue)" strokeWidth={1.8} />
                  </button>
                </>
              )}
              <button
                onClick={() => setShareOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-medium border"
                style={{ borderColor: "var(--color-gray-3)" }}
              >
                <Share2 size={16} color="var(--color-blue)" strokeWidth={1.8} /> Share
              </button>
            </div>
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
