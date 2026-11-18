"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, FileText, Mic, HardDrive } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowIcon, RowDivider } from "@/components/settings/settings-ui";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

interface StorageUsage {
  images_bytes: number;
  files_bytes: number;
  voice_bytes: number;
  total_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function StorageSettingsPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_storage_usage");
      if (!error && data?.[0]) setUsage(data[0] as StorageUsage);
      setLoading(false);
    })();
  }, []);

  const maxBytes = usage ? Math.max(usage.total_bytes, 1) : 1;
  const barWidth = (bytes: number) => `${Math.min(100, (bytes / maxBytes) * 100)}%`;

  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Storage and Data" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
            </div>
          ) : (
            <>
              {/* Hero — total used, glass tile with sheen. */}
              <div className="glass-card glass-sheen rounded-[28px] px-5 py-7 flex flex-col items-center text-center">
                <div className="glass w-[76px] h-[76px] rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.12)" }}>
                  <HardDrive size={34} color="var(--color-blue)" strokeWidth={1.7} />
                </div>
                <span className="text-title font-bold" style={{ fontSize: 32, lineHeight: "38px" }}>{formatBytes(usage?.total_bytes ?? 0)}</span>
                <span className="text-body mt-1" style={{ color: "var(--color-gray-1)" }}>Total Storage Used</span>
                <span className="text-caption mt-2" style={{ color: "var(--color-gray-1)" }}>
                  Media you uploaded — files others sent you are counted on their side.
                </span>
              </div>

              <div>
                <SectionLabel>Breakdown</SectionLabel>
                <SettingsCard>
                  <UsageRow icon={ImageIcon} label="Images" desc="Photos shared in chats" bytes={usage?.images_bytes ?? 0} barWidth={barWidth(usage?.images_bytes ?? 0)} color="var(--color-blue)" tint="rgba(0,122,255,0.12)" />
                  <RowDivider />
                  <UsageRow icon={FileText} label="Files" desc="Documents and other files" bytes={usage?.files_bytes ?? 0} barWidth={barWidth(usage?.files_bytes ?? 0)} color="var(--color-orange)" tint="rgba(255,149,0,0.12)" />
                  <RowDivider />
                  <UsageRow icon={Mic} label="Voice Notes" desc="Recorded voice messages" bytes={usage?.voice_bytes ?? 0} barWidth={barWidth(usage?.voice_bytes ?? 0)} color="var(--color-green)" tint="rgba(52,199,89,0.12)" />
                </SettingsCard>
              </div>
            </>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}

function UsageRow({
  icon: Icon, label, desc, bytes, barWidth, color, tint,
}: {
  icon: import("lucide-react").LucideIcon; label: string; desc: string; bytes: number; barWidth: string; color: string; tint: string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3">
        <RowIcon icon={Icon} tint={tint} color={color} />
        <div className="flex-1 min-w-0">
          <div className="text-body font-medium">{label}</div>
          <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>{desc}</div>
        </div>
        <span className="text-body font-semibold flex-shrink-0">{formatBytes(bytes)}</span>
      </div>
      <div className="h-2 rounded-full ml-[52px] mt-3 overflow-hidden" style={{ background: "var(--color-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: barWidth, background: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
    </div>
  );
}
