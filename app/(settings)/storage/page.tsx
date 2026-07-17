"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, FileText, Mic, HardDrive } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
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
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Storage and Data</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-5 mb-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(0,122,255,0.1)" }}>
                  <HardDrive size={28} color="var(--color-blue)" strokeWidth={1.8} />
                </div>
                <span className="text-2xl font-bold">{formatBytes(usage?.total_bytes ?? 0)}</span>
                <span className="text-sm" style={{ color: "var(--color-gray-1)" }}>Total Storage Used</span>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white">
                <UsageRow icon={ImageIcon} label="Images" bytes={usage?.images_bytes ?? 0} barWidth={barWidth(usage?.images_bytes ?? 0)} color="var(--color-blue)" />
                <UsageRow icon={FileText} label="Files" bytes={usage?.files_bytes ?? 0} barWidth={barWidth(usage?.files_bytes ?? 0)} color="var(--color-orange)" />
                <UsageRow icon={Mic} label="Voice Notes" bytes={usage?.voice_bytes ?? 0} barWidth={barWidth(usage?.voice_bytes ?? 0)} color="var(--color-green)" last />
              </div>
            </>
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}

function UsageRow({
  icon: Icon, label, bytes, barWidth, color, last,
}: {
  icon: import("lucide-react").LucideIcon; label: string; bytes: number; barWidth: string; color: string; last?: boolean;
}) {
  return (
    <div className="px-4 py-3.5" style={{ borderBottom: last ? "none" : "1px solid var(--color-gray-2)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </div>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold" style={{ color: "var(--color-gray-1)" }}>{formatBytes(bytes)}</span>
      </div>
      <div className="h-1.5 rounded-full ml-12" style={{ background: "var(--color-gray-2)" }}>
        <div className="h-full rounded-full" style={{ width: barWidth, background: color }} />
      </div>
    </div>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
