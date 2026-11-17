"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, Pencil, Phone, Video } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { TikTokProfileHeader } from "@/components/profile/TikTokProfileHeader";
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

      {/* Top bar — TikTok style: back left, @username centred, share right. */}
      <div className="flex items-center justify-between px-4 pt-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft size={22} color="var(--color-blue)" strokeWidth={2} />
        </button>
        <span className="text-body font-semibold truncate" style={{ color: "#1D1D1F" }}>
          @{profile.username}
        </span>
        <button
          onClick={() => setShareOpen(true)}
          className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Share profile"
        >
          <Share2 size={18} color="var(--color-blue)" strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[640px] mx-auto pb-8">
          <TikTokProfileHeader
            name={nickname || profile.full_name}
            username={profile.username}
            verified={profile.is_verified}
            premium={profile.is_premium}
            avatarUrl={profile.avatar_url}
            online={profile.is_online}
            bio={profile.bio}
            location={profile.location}
            joinedLabel={formatJoinDate(profile.created_at)}
            stats={[
              { value: (profile.spark_count ?? 0).toLocaleString(), label: "Total Sparks" },
              { value: sparkConnections.toLocaleString(), label: "Connections" },
            ]}
            nameExtra={
              !isSelf ? (
                <button
                  onClick={handleEditNickname}
                  aria-label="Edit nickname"
                  className="glass pressable w-7 h-7 rounded-full flex items-center justify-center ml-0.5"
                >
                  <Pencil size={13} color="var(--color-gray-1)" strokeWidth={1.8} />
                </button>
              ) : undefined
            }
            actions={
              <div className="flex items-center gap-2.5 px-4">
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
            }
          />
          {nickname && (
            <p className="text-center text-caption mt-2" style={{ color: "#6E6E73" }}>
              Real name: {profile.full_name} (nickname only you can see)
            </p>
          )}
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
