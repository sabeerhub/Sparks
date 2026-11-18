/**
 * app/(profile)/profile/[userId]/page.tsx
 * v1.8.1 — Apple-level minimalist rebuild. The v1.8.0 rebuild looked
 * right in code but not on his phone: the blue "Message" pill was too
 * small for its label ("Message" burst out of both sides) and the
 * Block row's description was cut off. Both are fixed here, and the
 * whole page is restyled to the Apple standard: open space, one clear
 * hierarchy (avatar → name → handle → stats → actions → tabs →
 * content), hairline dividers instead of heavy cards, one 48px action
 * height, nothing clipped, nothing cramped.
 *
 * ACTION ROW WIDTHS, measured at a 360px viewport (the narrowest
 * phone this must fit — worst case is the accepted state, Message +
 * voice + video + Share):
 *   360 − 32 (header px-4) − 24 (3 × 8px gaps) − 144 (3 × 48px
 *   circles) = 160px for the Message slot. "Message" at 16px semibold
 *   is ~67px + 40px (md px-5) = ~107px, so ~53px spare. At 320px the
 *   slot is 120px — still fits with ~13px spare. The old row left
 *   only ~80px for Message (two 52px circles + a ~112px Share pill)
 *   against ~115px needed — that is why the label burst out.
 *   Share is an icon circle now (the WhatsApp/Instagram pattern);
 *   the header already has a Share button too.
 *
 * Honest rules kept here:
 * - "Message" is NOT a separate button: the SparkRequestButton below
 *   already shows a real Message button once the Spark is accepted,
 *   and a standalone Message button would bypass the Spark handshake
 *   — the rule that nobody can message you until you accept them.
 * - No Report button: Sparks has no report feature, so none is shown.
 * - Block IS real (blocked_users table): a real Block / Unblock row.
 * - No fake counts: Total Sparks, Connections and Days Active are all
 *   read from the server; the media grid shows only photos that
 *   actually exist in your chat with this person.
 * - The nickname editor is a real bottom sheet now — window.prompt
 *   is gone.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, Pencil, Phone, Video, LayoutGrid, User, Image as ImageIcon, Ban, X } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { TikTokProfileHeader } from "@/components/profile/TikTokProfileHeader";
import { SparkRequestButton } from "@/components/spark/SparkRequestButton";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount, getNickname, setNickname, findDirectChatId, isUserBlocked, blockUser, unblockUser } from "@/services/chat-service";
import { hasAcceptedSpark } from "@/services/spark-service";
import { getChatMedia, getMediaUrl } from "@/services/media-service";
import { useCallActions } from "@/components/call/CallProvider";
import type { Profile } from "@/types";

const supabase = createClient();

function formatJoinDate(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function daysActive(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  return Math.max(1, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
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
      <span style={{ color: active ? "var(--color-black)" : "var(--color-gray-1)" }}>{icon}</span>
      <span
        className="text-caption font-semibold"
        style={{ color: active ? "var(--color-black)" : "var(--color-gray-1)" }}
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
      <span className="text-body flex-shrink-0" style={{ color: "#6E6E73" }}>{label}</span>
      <span className="text-body font-medium text-right truncate" style={{ color: "var(--color-black)" }}>{value}</span>
    </div>
  );
}

/** Inset hairline between grouped-list rows — the iOS separator. */
function Hairline() {
  return <div className="ml-4" style={{ height: 1, background: "var(--hairline)" }} />;
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
  const [tab, setTab] = useState<"media" | "about">("media");
  const [mediaThumbs, setMediaThumbs] = useState<string[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [blockArmed, setBlockArmed] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
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
      isUserBlocked(userId).then(setBlocked);
      // Shared media: only photos that exist in the chat with them.
      // findDirectChatId never creates a chat — viewing a profile
      // must not silently open a conversation.
      findDirectChatId(userId).then(async (chatId) => {
        if (!chatId) {
          setMediaLoading(false);
          return;
        }
        const items = await getChatMedia(chatId, 9);
        const urls = await Promise.all(items.map((t) => getMediaUrl(t.mediaPath)));
        setMediaThumbs(urls.filter((u): u is string => !!u));
        setMediaLoading(false);
      });
    } else {
      setMediaLoading(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const isSelf = currentUserId === userId;
  const firstName = profile?.full_name.split(" ")[0] ?? "this person";

  const openNicknameSheet = () => {
    setNickDraft(nickname ?? "");
    setNickOpen(true);
  };

  const handleSaveNickname = async () => {
    setNickSaving(true);
    await setNickname(userId, nickDraft);
    setNicknameState(nickDraft.trim() || null);
    setNickSaving(false);
    setNickOpen(false);
  };

  const handleBlockToggle = async () => {
    if (blockBusy) return;
    if (blocked) {
      setBlockBusy(true);
      try {
        await unblockUser(userId);
        setBlocked(false);
      } finally {
        setBlockBusy(false);
      }
      return;
    }
    // Two taps to block: the first arms it, the second confirms.
    // No pop-up, no accidental block.
    if (!blockArmed) {
      setBlockArmed(true);
      return;
    }
    setBlockBusy(true);
    try {
      await blockUser(userId);
      setBlocked(true);
      setBlockArmed(false);
    } finally {
      setBlockBusy(false);
    }
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
        <span className="text-body font-semibold truncate" style={{ color: "var(--color-black)" }}>
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
              { value: String(daysActive(profile.created_at)), label: "Days Active" },
            ]}
            nameExtra={
              !isSelf ? (
                <button
                  onClick={openNicknameSheet}
                  aria-label="Edit nickname"
                  className="glass pressable w-7 h-7 rounded-full flex items-center justify-center ml-0.5"
                >
                  <Pencil size={13} color="var(--color-gray-1)" strokeWidth={1.8} />
                </button>
              ) : undefined
            }
            actions={
              blocked ? (
                <p className="text-center text-body" style={{ color: "var(--color-gray-1)" }}>
                  You blocked {firstName}. Unblock below to message or call them again.
                </p>
              ) : (
                /* One 48px action height, one row, nothing squeezed:
                   Message flexes, voice / video / Share are 48px icon
                   circles. The header already pads px-4, so this row
                   adds none — everything aligns to the same 16px edge. */
                <div className="flex items-center gap-2">
                  {currentUserId && !isSelf && (
                    <div className="flex-1 min-w-0">
                      <SparkRequestButton targetUserId={userId} currentUserId={currentUserId} />
                    </div>
                  )}
                  {canCall && (
                    <>
                      <button
                        onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "voice")}
                        className="glass pressable w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
                        aria-label="Voice call"
                      >
                        <Phone size={20} color="var(--color-blue)" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => placeCall(userId, nickname || profile.full_name, profile.avatar_url, "video")}
                        className="glass pressable w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
                        aria-label="Video call"
                      >
                        <Video size={20} color="var(--color-blue)" strokeWidth={1.8} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShareOpen(true)}
                    className="glass pressable w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0"
                    aria-label="Share profile"
                  >
                    <Share2 size={19} color="var(--color-blue)" strokeWidth={1.8} />
                  </button>
                </div>
              )
            }
          />
          {nickname && (
            <p className="text-center text-caption mt-2" style={{ color: "#6E6E73" }}>
              Real name: {profile.full_name} (nickname only you can see)
            </p>
          )}

          {/* Tab bar — same as your own profile: Media / About. */}
          <div
            className="flex mt-8 sticky top-0 z-10"
            style={{ background: "color-mix(in srgb, var(--color-gray-2) 85%, transparent)", backdropFilter: "blur(24px) saturate(180%)" }}
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
              {mediaLoading ? (
                <div className="grid grid-cols-3 gap-[2px]">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-[10px] animate-pulse" style={{ aspectRatio: "3 / 4", background: "var(--color-gray-3)" }} />
                  ))}
                </div>
              ) : mediaThumbs.length > 0 ? (
                <>
                  <div className="px-3 py-2">
                    <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: "#6E6E73" }}>
                      {mediaThumbs.length} {mediaThumbs.length === 1 ? "photo" : "photos"} shared
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-[2px]">
                    {mediaThumbs.map((url) => (
                      <div key={url} className="rounded-[10px] overflow-hidden row-overlay">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          className="w-full object-cover"
                          style={{ aspectRatio: "3 / 4" }}
                          onError={() => setMediaThumbs((prev) => prev.filter((u) => u !== url))}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-12 px-4 text-center">
                  <div className="glass w-14 h-14 rounded-full flex items-center justify-center mb-3">
                    <ImageIcon size={22} color="#C7C7CC" strokeWidth={1.5} />
                  </div>
                  <p className="text-body font-medium" style={{ color: "var(--color-black)" }}>No shared media yet</p>
                  <p className="text-caption mt-1" style={{ color: "#6E6E73" }}>
                    Photos shared in your chats with {firstName} will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* About — Apple grouped-list style: plain bio text, then
               hairline-separated rows. No card around either; the page
               surface is the background, the hairlines do the work. */
            <div className="pt-5">
              <div className="px-4">
                <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: "#6E6E73" }}>About</span>
                <p className="text-body mt-2 leading-relaxed" style={{ color: "var(--color-black)" }}>
                  {profile.bio || "No bio yet."}
                </p>
              </div>
              <div className="mt-6 border-t" style={{ borderColor: "var(--hairline)" }}>
                <AboutRow label="Username" value={`@${profile.username}`} />
                <Hairline />
                <AboutRow label="Joined" value={formatJoinDate(profile.created_at)} />
                {profile.location && (
                  <>
                    <Hairline />
                    <AboutRow label="Location" value={profile.location} />
                  </>
                )}
                <Hairline />
                <AboutRow label="Days active" value={String(daysActive(profile.created_at))} />
              </div>
              <div className="border-t" style={{ borderColor: "var(--hairline)" }} />
            </div>
          )}

          {/* Block — the one real safety action. Two taps to block, so
              it can never happen by accident; tap again to unblock.
              An iOS-style destructive row: hairlines top and bottom,
              no card. The description wraps in full (explicit
              whitespace-normal + comfortable line height) — the old
              card cut it off. The armed label is the short "Confirm":
              "Tap again to block" was so long it squeezed the row. */}
          {!isSelf && (
            <div className="mt-8 border-t border-b" style={{ borderColor: "var(--hairline)" }}>
              <button
                onClick={handleBlockToggle}
                disabled={blockBusy}
                className="pressable w-full flex items-center gap-3 px-4 py-4 text-left disabled:opacity-50"
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,59,48,0.12)" }}
                >
                  <Ban size={19} color="#FF3B30" strokeWidth={1.8} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-body font-medium whitespace-normal" style={{ color: "var(--color-black)" }}>
                    {blocked ? `Unblock ${firstName}` : `Block ${firstName}`}
                  </span>
                  <span className="block text-caption whitespace-normal break-words" style={{ color: "#6E6E73", lineHeight: "18px" }}>
                    {blocked
                      ? "They can't message or call you right now."
                      : "They won't be able to message or call you."}
                  </span>
                </span>
                <span
                  className="text-body font-semibold flex-shrink-0 whitespace-nowrap"
                  style={{ color: blockArmed ? "#FF3B30" : "var(--color-blue)" }}
                >
                  {blocked ? "Unblock" : blockArmed ? "Confirm" : "Block"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ShareProfileSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        userId={profile.id}
        username={profile.username}
      />

      {/* Nickname sheet — a real editor, not a browser prompt. */}
      {nickOpen && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setNickOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="glass-strong relative w-full rounded-t-3xl px-4 pt-3 pb-8 max-w-lg mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-gray-3)" }} />
            <h2 className="text-body font-semibold text-center mb-1">Nickname</h2>
            <p className="text-caption text-center mb-5" style={{ color: "var(--color-gray-1)" }}>
              Only you will see this name for {profile.full_name}.
            </p>
            <input
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              placeholder={profile.full_name}
              autoFocus
              aria-label="Nickname"
              className="glass-input w-full rounded-full px-4 py-3 text-body outline-none mb-3"
              style={{ color: "var(--color-black)" }}
              maxLength={40}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNickOpen(false)}
                className="glass pressable flex-1 rounded-full py-3 text-body font-semibold"
                style={{ color: "var(--color-black)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNickname}
                disabled={nickSaving}
                className="pressable flex-1 rounded-full py-3 text-body font-semibold disabled:opacity-50"
                style={{ background: "var(--color-blue)", color: "white" }}
              >
                {nickSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {nickname && (
              <button
                onClick={async () => {
                  setNickSaving(true);
                  await setNickname(userId, "");
                  setNicknameState(null);
                  setNickSaving(false);
                  setNickOpen(false);
                }}
                className="w-full text-center text-body font-medium mt-3 py-1"
                style={{ color: "var(--color-red)" }}
              >
                Remove nickname
              </button>
            )}
            <button
              onClick={() => setNickOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-gray-3)" }}
            >
              <X size={16} color="var(--color-gray-1)" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
