"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Bell, HardDrive, Sun, Globe, HelpCircle, Info, ShieldCheck, LogOut, ChevronRight, BadgeCheck } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { SettingsHeader, SectionLabel, SettingsCard, SettingsRow, RowDivider } from "@/components/settings/settings-ui";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, []);

  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Settings" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {/* Profile hero — the Apple Settings way in: your card first. */}
          <button
            onClick={() => router.push("/profile")}
            className="pressable glass-card glass-sheen rounded-[28px] w-full flex items-center gap-4 p-5 text-left"
          >
            <Avatar name={profile?.full_name ?? "?"} src={profile?.avatar_url} size={64} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-title font-bold truncate">{profile?.full_name ?? "Your Profile"}</span>
                {profile?.is_verified && <BadgeCheck size={18} fill="var(--color-blue)" color="white" className="flex-shrink-0" />}
              </span>
              <span className="block text-body mt-0.5 truncate" style={{ color: "var(--color-gray-1)" }}>
                @{profile?.username ?? "…"}
              </span>
              <span className="block text-caption mt-1" style={{ color: "var(--color-blue)" }}>
                View and edit your profile
              </span>
            </span>
            <ChevronRight size={18} color="#C7C7CC" strokeWidth={1.8} className="flex-shrink-0" />
          </button>

          <div>
            <SectionLabel>Your Account</SectionLabel>
            <SettingsCard>
              <SettingsRow icon={User} label="Account" desc="Name, username, email, password" onClick={() => router.push("/settings/account")} />
              <RowDivider />
              <SettingsRow icon={Lock} tint="rgba(110,110,115,0.12)" iconColor="var(--color-gray-1)" label="Privacy" desc="Last seen, online status, blocked users" onClick={() => router.push("/settings/privacy")} />
              <RowDivider />
              <SettingsRow icon={Bell} tint="rgba(255,59,48,0.12)" iconColor="var(--color-red)" label="Notifications" desc="Messages, Sparks, calls" onClick={() => router.push("/settings/notifications")} />
              <RowDivider />
              <SettingsRow icon={ShieldCheck} tint="rgba(52,199,89,0.12)" iconColor="var(--color-green)" label="Security" desc="Devices, verification, sign out" onClick={() => router.push("/settings/security")} />
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>App</SectionLabel>
            <SettingsCard>
              <SettingsRow icon={HardDrive} tint="rgba(255,149,0,0.12)" iconColor="var(--color-orange)" label="Storage and Data" desc="See what your media uses" onClick={() => router.push("/settings/storage")} />
              <RowDivider />
              <SettingsRow icon={Sun} label="Appearance" desc="Theme, font size, bubble size" onClick={() => router.push("/settings/appearance")} />
              <RowDivider />
              <SettingsRow icon={Globe} label="Language" value="English" onClick={() => router.push("/settings/language")} />
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>About</SectionLabel>
            <SettingsCard>
              <SettingsRow icon={HelpCircle} tint="rgba(52,199,89,0.12)" iconColor="var(--color-green)" label="Help & Support" desc="Get help by email" onClick={() => router.push("/settings/help")} />
              <RowDivider />
              <SettingsRow icon={Info} label="About Sparks" desc="Version and info" onClick={() => router.push("/settings/about")} />
            </SettingsCard>
          </div>

          <SettingsCard>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="pressable w-full flex items-center gap-3 px-4 py-4 text-left"
            >
              <span className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.12)" }}>
                <LogOut size={19} color="var(--color-red)" strokeWidth={1.8} />
              </span>
              <span className="text-body font-medium" style={{ color: "var(--color-red)" }}>Log Out</span>
            </button>
          </SettingsCard>
        </div>
      </div>
    </ScreenContainer>
  );
}
