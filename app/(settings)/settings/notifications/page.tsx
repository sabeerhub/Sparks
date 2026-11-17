"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus, BadgeCheck, Phone, Video, CheckCheck, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowIcon, RowDivider, ToggleRow } from "@/components/settings/settings-ui";
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
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Notifications" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {message && (
            <div className="glass-card px-4 py-3.5 rounded-[20px] text-body font-medium" style={{ background: "rgba(52,199,89,0.14)", color: "var(--color-green)" }}>
              {message}
            </div>
          )}

          <div>
            <SectionLabel>Notify Me About</SectionLabel>
            <SettingsCard>
              <ToggleRow icon={MessageCircle} label="Messages" desc="New messages in your chats" checked={profile.notify_messages} onChange={(v) => updateField({ notify_messages: v })} />
              <RowDivider />
              <ToggleRow icon={UserPlus} label="Spark Requests" desc="Someone wants to connect with you" checked={profile.notify_spark_requests} onChange={(v) => updateField({ notify_spark_requests: v })} />
              <RowDivider />
              <ToggleRow icon={BadgeCheck} label="Spark Accepted" desc="Your Spark request was accepted" checked={profile.notify_spark_accepted} onChange={(v) => updateField({ notify_spark_accepted: v })} />
              <RowDivider />
              <ToggleRow icon={Phone} label="Voice Calls" desc="Incoming voice calls" checked={profile.notify_voice_calls} onChange={(v) => updateField({ notify_voice_calls: v })} />
              <RowDivider />
              <ToggleRow icon={Video} label="Video Calls" desc="Incoming video calls" checked={profile.notify_video_calls} onChange={(v) => updateField({ notify_video_calls: v })} />
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Turning off a call notification silences its ringtone — the call still shows on screen.
            </p>
          </div>

          <div>
            <SectionLabel>Manage</SectionLabel>
            <SettingsCard>
              <button onClick={handleMarkAllRead} className="pressable w-full flex items-center gap-3 px-4 py-4 text-left">
                <RowIcon icon={CheckCheck} />
                <span className="text-body font-medium flex-1">Mark All as Read</span>
              </button>
              <RowDivider />
              <button onClick={handleClearAll} className="pressable w-full flex items-center gap-3 px-4 py-4 text-left">
                <RowIcon icon={Trash2} tint="rgba(255,59,48,0.12)" color="var(--color-red)" />
                <span className="text-body font-medium flex-1" style={{ color: "var(--color-red)" }}>Clear All Notifications</span>
              </button>
            </SettingsCard>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
