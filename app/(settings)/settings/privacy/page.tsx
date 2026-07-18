"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Radio, CheckCheck, Keyboard, UserCircle, Zap, Ban } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { updateOwnProfile, getBlockedUsers, unblockUser } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any).select("*").eq("id", user.id).maybeSingle();
      setProfile(data as Profile);

      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);
      setLoading(false);
    })();
  }, [router]);

  const updateField = async (patch: Partial<Profile>) => {
    if (!userId || !profile) return;
    setProfile({ ...profile, ...patch });
    await updateOwnProfile(userId, patch).catch(() => {
      setProfile(profile);
    });
  };

  const handleUnblock = async (blockedId: string) => {
    setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
    await unblockUser(blockedId).catch(() => {});
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
          <h1 className="text-xl font-bold ml-3">Privacy</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Visibility</p>
          <div className="rounded-2xl overflow-hidden bg-white mb-4">
            <ToggleRow icon={Eye} label="Last Seen" desc="Let others see when you were last active" checked={profile.last_seen_visible} onChange={(v) => updateField({ last_seen_visible: v })} />
            <ToggleRow icon={Radio} label="Online Status" desc="Show a green dot when you're online" checked={profile.online_status_visible} onChange={(v) => updateField({ online_status_visible: v })} />
            <ToggleRow icon={CheckCheck} label="Read Receipts" desc="Let others see when you've read their messages" checked={profile.read_receipts_enabled} onChange={(v) => updateField({ read_receipts_enabled: v })} />
            <ToggleRow icon={Keyboard} label="Typing Indicator" desc="Show others when you're typing" checked={profile.typing_indicator_enabled} onChange={(v) => updateField({ typing_indicator_enabled: v })} last />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Access</p>
          <div className="rounded-2xl overflow-hidden bg-white mb-4">
            <SelectRow
              icon={UserCircle}
              label="Profile Visibility"
              value={profile.profile_visibility}
              options={[
                { value: "everyone", label: "Everyone" },
                { value: "sparks_only", label: "Sparks Only" },
                { value: "nobody", label: "Nobody" },
              ]}
              onChange={(v) => updateField({ profile_visibility: v as Profile["profile_visibility"] })}
            />
            <SelectRow
              icon={Zap}
              label="Who Can Send Sparks"
              value={profile.who_can_spark}
              options={[
                { value: "everyone", label: "Everyone" },
                { value: "nobody", label: "Nobody" },
              ]}
              onChange={(v) => updateField({ who_can_spark: v as Profile["who_can_spark"] })}
              last
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Blocked Users</p>
          <div className="rounded-2xl overflow-hidden bg-white">
            {blockedUsers.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <Ban size={18} color="var(--color-gray-1)" strokeWidth={1.8} />
                <span className="text-sm" style={{ color: "var(--color-gray-1)" }}>No blocked users</span>
              </div>
            ) : (
              blockedUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < blockedUsers.length - 1 ? "1px solid var(--color-gray-2)" : "none" }}>
                  <Avatar name={u.full_name} src={u.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.full_name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>@{u.username}</div>
                  </div>
                  <button onClick={() => handleUnblock(u.id)} className="text-xs font-semibold" style={{ color: "var(--color-blue)" }}>
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function ToggleRow({
  icon: Icon, label, desc, checked, onChange, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--color-gray-2)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
        <Icon size={18} color="var(--color-blue)" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full flex-shrink-0 relative transition-colors"
        style={{ background: checked ? "var(--color-green)" : "var(--color-gray-3)" }}
        aria-label={label}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

function SelectRow({
  icon: Icon, label, value, options, onChange, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; value: string;
  options: { value: string; label: string }[]; onChange: (v: string) => void; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--color-gray-2)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
        <Icon size={18} color="var(--color-blue)" strokeWidth={1.8} />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm font-medium outline-none bg-transparent text-right"
        style={{ color: "var(--color-blue)" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
