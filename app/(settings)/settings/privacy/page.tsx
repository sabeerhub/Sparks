"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Radio, CheckCheck, Keyboard, UserCircle, UserPlus, Ban } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { SettingsHeader, SectionLabel, SettingsCard, RowIcon, RowDivider, ToggleRow } from "@/components/settings/settings-ui";
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
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Privacy" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          <div>
            <SectionLabel>Visibility</SectionLabel>
            <SettingsCard>
              <ToggleRow icon={Eye} label="Last Seen" desc="Let others see when you were last active" checked={profile.last_seen_visible} onChange={(v) => updateField({ last_seen_visible: v })} />
              <RowDivider />
              <ToggleRow icon={Radio} label="Online Status" desc="Show a green dot when you're online" checked={profile.online_status_visible} onChange={(v) => updateField({ online_status_visible: v })} />
              <RowDivider />
              <ToggleRow icon={CheckCheck} label="Read Receipts" desc="Let others see when you've read their messages" checked={profile.read_receipts_enabled} onChange={(v) => updateField({ read_receipts_enabled: v })} />
              <RowDivider />
              <ToggleRow icon={Keyboard} label="Typing Indicator" desc="Show others when you're typing" checked={profile.typing_indicator_enabled} onChange={(v) => updateField({ typing_indicator_enabled: v })} />
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>Access</SectionLabel>
            <SettingsCard>
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
              <RowDivider />
              <SelectRow
                icon={UserPlus}
                label="Who Can Send Sparks"
                value={profile.who_can_spark}
                options={[
                  { value: "everyone", label: "Everyone" },
                  { value: "nobody", label: "Nobody" },
                ]}
                onChange={(v) => updateField({ who_can_spark: v as Profile["who_can_spark"] })}
              />
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>Blocked Users</SectionLabel>
            <SettingsCard>
              {blockedUsers.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-5">
                  <RowIcon icon={Ban} tint="rgba(110,110,115,0.12)" color="var(--color-gray-1)" />
                  <div>
                    <div className="text-body font-medium">No blocked users</div>
                    <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>People you block will appear here.</div>
                  </div>
                </div>
              ) : (
                blockedUsers.map((u, i) => (
                  <div key={u.id}>
                    {i > 0 && <RowDivider />}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar name={u.full_name} src={u.avatar_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="text-body font-medium truncate">{u.full_name}</div>
                        <div className="text-caption truncate" style={{ color: "var(--color-gray-1)" }}>@{u.username}</div>
                      </div>
                      <button onClick={() => handleUnblock(u.id)} className="glass pressable px-3.5 py-1.5 rounded-full text-caption font-semibold flex-shrink-0" style={{ color: "var(--color-blue)" }}>
                        Unblock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </SettingsCard>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function SelectRow({
  icon: Icon, label, value, options, onChange,
}: {
  icon: import("lucide-react").LucideIcon; label: string; value: string;
  options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <RowIcon icon={Icon} />
      <span className="flex-1 text-body font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass px-3 py-1.5 rounded-full text-body font-semibold outline-none text-right"
        style={{ color: "var(--color-blue)" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
