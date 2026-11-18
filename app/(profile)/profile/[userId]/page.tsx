/**
 * app/(profile)/profile/[userId]/page.tsx
 * v1.8.2 — two refinements on the friend profile, the user's pick
 * after seeing v1.8.1:
 * - Top-right Share button is now a 3-dot menu (bottom sheet on
 *   mobile, centred menu on desktop): Share profile (the same share
 *   flow), About account (switches to the About tab), Block user in
 *   red (the SAME two-tap block flow as the Block row below — first
 *   tap arms, second confirms; "Unblock user" while blocked). The
 *   bottom Block row stays as the visible safety action.
 * - Shared media grid is now the standard: square 1:1 tiles, uniform
 *   2px gaps, clean edges — and tapping a photo opens it full-screen
 *   in the WhatsApp-standard image viewer (sender + time + n of m,
 *   Download + Share, pinch/double-tap zoom, Esc/arrows). The old
 *   3:4 portrait tiles were plain images with no tap action.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, Pencil, Phone, Video, LayoutGrid, User, Image as ImageIcon, Ban, X, MoreHorizontal, Info } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { TikTokProfileHeader } from "@/components/profile/TikTokProfileHeader";
import { SparkRequestButton } from "@/components/spark/SparkRequestButton";
import { ImageViewer, type ViewerImage } from "@/components/chat/ImageViewer";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount, getNickname, setNickname, findDirectChatId, isUserBlocked, blockUser, unblockUser } from "@/services/chat-service";
import { hasAcceptedSpark } from "@/services/spark-service";
import { getChatMedia, getMediaUrl } from "@/services/media-service";
import { useCallActions } from "@/components/call/CallProvider";
import { formatMessageTime } from "@/utils/helpers";
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
  // Shared media, with sender + time + file name attached — the grid
  // needs them to open a photo in the full image viewer.
  const [mediaItems, setMediaItems] = useState<{ id: string; mediaPath: string; url: string; senderId: string; createdAt: string; fileName: string }[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
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
        // The grid + viewer show the whole shared history, sent and
        // received, newest first — not just the first few photos.
        const items = await getChatMedia(chatId, 100);
        const resolved = await Promise.all(
          items.map(async (t) => ({ ...t, url: await getMediaUrl(t.mediaPath) }))
        );
        setMediaItems(resolved.filter((t): t is typeof t & { url: string } => !!t.url));
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

  // The menu's Block row runs the SAME two-tap flow as the Block row
  // below — it just lives in the menu. First tap arms it (the menu
  // stays open and the row becomes "Confirm block"); second tap
  // confirms and the menu closes. Unblocking closes straight away.
  const handleMenuBlock = async () => {
    if (blocked || blockArmed) {
      await handleBlockToggle();
      setMenuOpen(false);
      return;
    }
    handleBlockToggle();
  };

  // Every shared photo, in grid order, for the full image viewer.
  const viewerImages: ViewerImage[] = mediaItems.map((t) => ({
    path: t.mediaPath,
    url: t.url,
    senderName: t.senderId === currentUserId ? "You" : profile?.full_name ?? "",
    timestamp: formatMessageTime(t.createdAt),
    fileName: t.fileName,
  }));

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

  // v1.9.0 — the 3-dot menu rows, shared by the phone bottom sheet
  // and the desktop popover anchored to the button.
  const menuBody = (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-row-overlay)" }}>
        <button
          type="button"
          onClick={() => { setMenuOpen(false); setShareOpen(true); }}
          className="pressable w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
            <Share2 size={16} color="var(--color-blue)" strokeWidth={1.8} />
          </span>
          <span className="text-body" style={{ color: "var(--color-black)" }}>Share profile</span>
        </button>
        <div className="ml-[60px]" style={{ height: 1, background: "var(--hairline)" }} />
        <button
          type="button"
          onClick={() => { setMenuOpen(false); setTab("about"); }}
          className="pressable w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-gray-3)" }}>
            <Info size={16} color="var(--color-gray-1)" strokeWidth={1.8} />
          </span>
          <span className="text-body" style={{ color: "var(--color-black)" }}>About account</span>
        </button>
        {!isSelf && (
          <>
            <div className="ml-[60px]" style={{ height: 1, background: "var(--hairline)" }} />
            <button
              type="button"
              onClick={handleMenuBlock}
              disabled={blockBusy}
              className="pressable w-full flex items-center gap-3 px-4 py-3.5 text-left disabled:opacity-50"
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.12)" }}>
                <Ban size={16} color="#FF3B30" strokeWidth={1.8} />
              </span>
              <span className="text-body font-medium" style={{ color: blocked ? "var(--color-blue)" : "#FF3B30" }}>
                {blocked ? "Unblock user" : blockArmed ? "Confirm block" : "Block user"}
              </span>
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => { setMenuOpen(false); setBlockArmed(false); }}
        className="pressable w-full mt-2 py-3.5 rounded-2xl text-body font-semibold"
        style={{ background: "var(--color-row-overlay)", color: "var(--color-blue)" }}
      >
        Cancel
      </button>
    </>
  );

  return (
    <div className="app-surface h-full w-full flex flex-col overflow-hidden">
      <StatusBar />

      {/* Top bar — TikTok style: back left, @username centred, 3-dot
          menu right. The menu holds Share profile, About account and
          Block user — every row does something real. */}
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
        <div className="relative">
          <button
            onClick={() => setMenuOpen(true)}
            className="glass pressable w-11 h-11 rounded-full flex items-center justify-center"
            aria-label="More options"
            aria-haspopup="menu"
          >
            <MoreHorizontal size={20} color="var(--color-blue)" strokeWidth={2} />
          </button>
          {/* v1.9.0 — desktop: the menu is a popover anchored to this
              button, not a sheet floating in the middle of the screen.
              Phone still gets the bottom sheet below. */}
          {menuOpen && (
            <>
              <div className="hidden md:block fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setBlockArmed(false); }} />
              <div className="hidden md:block absolute right-0 top-full mt-2 z-50 w-[320px] glass-strong rounded-[28px] px-2 pt-3 pb-3 shadow-2xl" role="menu" aria-label="Profile options">
                {menuBody}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[640px] md:max-w-[720px] mx-auto pb-8">
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
            // v1.9.0 — "Total Sparks" removed: spark_count has no
            // definition anywhere in the code or the database, so the
            // number could not be explained honestly.
            stats={[
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
            /* Shared media — the standard grid (WhatsApp / Instagram):
               square 1:1 tiles, uniform 2px gaps, clean square edges,
               flush to the screen edges. Tapping a photo opens it
               full-screen in the image viewer (sender + time, n of m,
               Download + Share, pinch / double-tap zoom). */
            <div>
              {mediaLoading ? (
                <div className="grid grid-cols-3 gap-[2px]">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--color-gray-3)" }} />
                  ))}
                </div>
              ) : mediaItems.length > 0 ? (
                <>
                  <div className="px-3 py-2">
                    <span className="text-caption font-semibold uppercase tracking-wide" style={{ color: "#6E6E73" }}>
                      {mediaItems.length} {mediaItems.length === 1 ? "photo" : "photos"} shared
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-[2px]">
                    {mediaItems.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setViewerIndex(i)}
                        aria-label={`Open shared photo ${i + 1} of ${mediaItems.length}`}
                        className="pressable relative aspect-square overflow-hidden"
                        style={{ background: "var(--color-gray-3)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => setMediaItems((prev) => prev.filter((t) => t.id !== item.id))}
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

      {/* 3-dot menu — phone: the iOS action sheet. Desktop gets the
          popover anchored to the button in the top bar instead. */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
          onClick={() => { setMenuOpen(false); setBlockArmed(false); }}
          role="menu"
          aria-label="Profile options"
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div
            className="glass-strong relative w-full max-w-lg rounded-t-3xl px-2 pt-3 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "var(--color-gray-3)" }} />
            {menuBody}
          </div>
        </div>
      )}

      {/* Full-screen image viewer for the shared-media grid. */}
      {viewerIndex !== null && (
        <ImageViewer
          images={viewerImages}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

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
