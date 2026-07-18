"use client";

import { useRouter } from "next/navigation";
import { User, Lock, Bell, HardDrive, Sun, Globe, HelpCircle, Info, ShieldCheck, LogOut, ChevronRight } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  label: string;
  icon: import("lucide-react").LucideIcon;
  color: string;
  value?: string;
  path: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const sections: Row[][] = [
    [
      { label: "Account", icon: User, color: "var(--color-blue)", path: "/settings/account" },
      { label: "Privacy", icon: Lock, color: "var(--color-gray-1)", path: "/settings/privacy" },
      { label: "Notifications", icon: Bell, color: "var(--color-red)", path: "/settings/notifications" },
      { label: "Security", icon: ShieldCheck, color: "var(--color-green)", path: "/settings/security" },
    ],
    [
      { label: "Storage and Data", icon: HardDrive, color: "var(--color-orange)", path: "/settings/storage" },
      { label: "Appearance", icon: Sun, color: "var(--color-blue)", path: "/settings/appearance" },
      { label: "Language", icon: Globe, color: "var(--color-blue)", value: "English", path: "/settings/language" },
    ],
    [
      { label: "Help & Support", icon: HelpCircle, color: "var(--color-green)", path: "/settings/help" },
      { label: "About Sparks", icon: Info, color: "var(--color-blue)", path: "/settings/about" },
    ],
  ];

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
          {sections.map((rows, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white">
              {rows.map((row, j) => (
                <button
                  key={row.label}
                  onClick={() => router.push(row.path)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: j < rows.length - 1 ? "1px solid var(--color-gray-2)" : "none" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${row.color}20` }}>
                    <row.icon size={18} color={row.color} strokeWidth={1.8} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-left">{row.label}</span>
                  {row.value && <span className="text-sm" style={{ color: "var(--color-gray-1)" }}>{row.value}</span>}
                  <ChevronRight size={16} color="var(--color-gray-1)" strokeWidth={1.8} />
                </button>
              ))}
            </div>
          ))}

          <div className="rounded-2xl overflow-hidden bg-white">
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,59,48,0.12)" }}>
                <LogOut size={18} color="var(--color-red)" strokeWidth={1.8} />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--color-red)" }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
