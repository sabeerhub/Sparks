"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Type, MessageSquare, Check } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
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
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Appearance</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Theme</p>
          <div className="rounded-2xl overflow-hidden bg-white mb-4">
            <OptionRow icon={Sun} label="Light" selected={profile.theme_preference === "light"} onClick={() => updateField({ theme_preference: "light" })} />
            <OptionRow icon={Moon} label="Dark (coming soon)" selected={false} disabled onClick={() => {}} last />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Font Size</p>
          <div className="rounded-2xl overflow-hidden bg-white mb-4">
            <OptionRow icon={Type} label="Small" selected={profile.font_size === "small"} onClick={() => updateField({ font_size: "small" })} />
            <OptionRow icon={Type} label="Medium" selected={profile.font_size === "medium"} onClick={() => updateField({ font_size: "medium" })} />
            <OptionRow icon={Type} label="Large" selected={profile.font_size === "large"} onClick={() => updateField({ font_size: "large" })} last />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>Chat Bubble Size</p>
          <div className="rounded-2xl overflow-hidden bg-white">
            <OptionRow icon={MessageSquare} label="Compact" selected={profile.bubble_size === "compact"} onClick={() => updateField({ bubble_size: "compact" })} />
            <OptionRow icon={MessageSquare} label="Standard" selected={profile.bubble_size === "standard"} onClick={() => updateField({ bubble_size: "standard" })} />
            <OptionRow icon={MessageSquare} label="Large" selected={profile.bubble_size === "large"} onClick={() => updateField({ bubble_size: "large" })} last />
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function OptionRow({
  icon: Icon, label, selected, onClick, disabled, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; selected: boolean; onClick: () => void; disabled?: boolean; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 disabled:opacity-40"
      style={{ borderBottom: last ? "none" : "1px solid var(--color-gray-2)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.12)" }}>
        <Icon size={18} color="var(--color-blue)" strokeWidth={1.8} />
      </div>
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {selected && <Check size={18} color="var(--color-blue)" strokeWidth={2.2} />}
    </button>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
