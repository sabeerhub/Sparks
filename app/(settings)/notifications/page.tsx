"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Zap, BadgeCheck, Phone, Video, Users, CheckCheck, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { updateOwnProfile } from "@/services/chat-service";
import { markAllNotificationsRead, clearAllNotifications } from "@/services/notification-service";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any).select("*").eq("id", user.id).maybeSingle();
      setProfile(data as Profile);
      setLoading(false);
    })();
  }, [router]);

  const updateField = async (patch: Partial<Profile>) => {
    if (!userId || !profile) return;
    setProfile({ ...profile, ...patch });
    await updateOwnProfile(userId, patch).catch(() => setProfile(profile));
  };

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    flash("All notifications marked as read.");
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all notifications? This can't be undone.")) return;
    await clearAllNotifications().catch(() => {});
    flash("All notifications cleared.");
  };

  if (loading || !profile) {
    return (
      <ScreenContainer>
        <StatusBar />
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Notifications</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {message && (
            <div className="mb-4 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(52,199,89,0.12)", color: "var(--color-green)" }}>
              {message}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Notify Me About</p>
          <div className="rounded-2xl overflow-hidden bg-white mb-4">
            <ToggleRow icon={MessageCircle} label="Messages" checked={profile.notify_messages} onChange={(v) => updateField({ notify_messages: v })} />
            <ToggleRow icon={Zap} label="Spark Requests" checked={profile.notify_spark_requests} onChange={(v) => updateField({ notify_spark_requests: v })} />
            <ToggleRow icon={BadgeCheck} label="Spark Accepted" checked={profile.notify_spark_accepted} onChange={(v) => updateField({ notify_spark_accepted: v })} />
            <ToggleRow icon={Phone} label="Voice Calls" checked={profile.notify_voice_calls} onChange={(v) => updateField({ notify_voice_calls: v })} />
            <ToggleRow icon={Video} label="Video Calls" checked={profile.notify_video_calls} onChange={(v) => updateField({ notify_video_calls: v })} />
            <ToggleRow icon={Users} label="Group Notifications" checked={profile.notify_groups} onChange={(v) => updateField({ notify_groups: v })} last />
          </div>

          <div className="rounded-2xl overflow-hidden bg-white">
            <button onClick={handleMarkAllRead} className="w-full flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
                <CheckCheck size={18} color="var(--color-blue)" strokeWidth={1.8} />
              </div>
              <span className="text-sm font-medium">Mark All as Read</span>
            </button>
            <button onClick={handleClearAll} className="w-full flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.12)" }}>
                <Trash2 size={18} color="var(--color-red)" strokeWidth={1.8} />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--color-red)" }}>Clear All Notifications</span>
            </button>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function ToggleRow({
  icon: Icon, label, checked, onChange, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--color-gray-2)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
        <Icon size={18} color="var(--color-blue)" strokeWidth={1.8} />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full flex-shrink-0 relative transition-colors"
        style={{ background: checked ? "var(--color-green)" : "var(--color-gray-3)" }}
        aria-label={label}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </div>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
