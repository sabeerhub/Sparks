"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Type, MessageSquare } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowDivider, OptionRow } from "@/components/settings/settings-ui";
import { updateOwnProfile } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function AppearanceSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

    // Apply instantly, don't wait for the round trip
    if (patch.font_size) document.documentElement.setAttribute("data-font-size", patch.font_size);
    if (patch.bubble_size) document.documentElement.setAttribute("data-bubble-size", patch.bubble_size);
    if (patch.theme_preference) document.documentElement.setAttribute("data-theme", patch.theme_preference);

    await updateOwnProfile(userId, patch).catch(() => setProfile(profile));
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
        <SettingsHeader title="Appearance" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          <div>
            <SectionLabel>Theme</SectionLabel>
            <SettingsCard>
              <OptionRow
                icon={Sun}
                label="Light"
                preview={<span className="w-8 h-8 rounded-full flex-shrink-0 border" style={{ background: "#fff", borderColor: "var(--color-gray-3)" }} />}
                selected={profile.theme_preference === "light"}
                onClick={() => updateField({ theme_preference: "light" })}
              />
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Sparks is light theme only, by design.
            </p>
          </div>

          <div>
            <SectionLabel>Font Size</SectionLabel>
            <SettingsCard>
              <OptionRow
                icon={Type}
                label="Small"
                preview={<span className="font-semibold flex-shrink-0" style={{ fontSize: 14 }}>Aa</span>}
                selected={profile.font_size === "small"}
                onClick={() => updateField({ font_size: "small" })}
              />
              <RowDivider />
              <OptionRow
                icon={Type}
                label="Medium"
                preview={<span className="font-semibold flex-shrink-0" style={{ fontSize: 16 }}>Aa</span>}
                selected={profile.font_size === "medium"}
                onClick={() => updateField({ font_size: "medium" })}
              />
              <RowDivider />
              <OptionRow
                icon={Type}
                label="Large"
                preview={<span className="font-semibold flex-shrink-0" style={{ fontSize: 19 }}>Aa</span>}
                selected={profile.font_size === "large"}
                onClick={() => updateField({ font_size: "large" })}
              />
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>Chat Bubble Size</SectionLabel>
            <SettingsCard>
              <OptionRow
                icon={MessageSquare}
                label="Compact"
                preview={<span className="px-3 py-1 rounded-2xl text-caption font-medium flex-shrink-0" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)" }}>Hello</span>}
                selected={profile.bubble_size === "compact"}
                onClick={() => updateField({ bubble_size: "compact" })}
              />
              <RowDivider />
              <OptionRow
                icon={MessageSquare}
                label="Standard"
                preview={<span className="px-3.5 py-2 rounded-[20px] text-body font-medium flex-shrink-0" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)" }}>Hello</span>}
                selected={profile.bubble_size === "standard"}
                onClick={() => updateField({ bubble_size: "standard" })}
              />
              <RowDivider />
              <OptionRow
                icon={MessageSquare}
                label="Large"
                preview={<span className="px-4 py-2.5 rounded-[22px] font-medium flex-shrink-0" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)", fontSize: 18 }}>Hello</span>}
                selected={profile.bubble_size === "large"}
                onClick={() => updateField({ bubble_size: "large" })}
              />
            </SettingsCard>
            <p className="text-caption mt-2 px-2" style={{ color: "var(--color-gray-1)" }}>
              Changes apply to your chats right away.
            </p>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
