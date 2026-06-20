"use client";

import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { useAuth } from "@/hooks/useAuth";

type IconName = "account" | "privacy" | "notifications" | "chats" | "storage" | "appearance" | "language" | "help" | "about";

const SECTIONS: { rows: { label: string; icon: IconName; color: string; value?: string }[] }[] = [
  {
    rows: [
      { label: "Account", icon: "account", color: "var(--color-blue)" },
      { label: "Privacy", icon: "privacy", color: "var(--color-gray-1)" },
      { label: "Notifications", icon: "notifications", color: "var(--color-red)" },
      { label: "Chats", icon: "chats", color: "var(--color-green)" },
    ],
  },
  {
    rows: [
      { label: "Storage and Data", icon: "storage", color: "var(--color-orange)" },
      { label: "Appearance", icon: "appearance", color: "var(--color-blue)" },
      { label: "Language", icon: "language", color: "var(--color-blue)", value: "English" },
    ],
  },
  {
    rows: [
      { label: "Help & Support", icon: "help", color: "var(--color-green)" },
      { label: "About Sparks", icon: "about", color: "var(--color-blue)" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

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
          {SECTIONS.map((sec, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white">
              {sec.rows.map((row, j) => (
                <button
                  key={row.label}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: j < sec.rows.length - 1 ? "1px solid var(--color-gray-2)" : "none" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${row.color}20` }}>
                    <SettingsIcon name={row.icon} color={row.color} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-left">{row.label}</span>
                  {row.value && <span className="text-sm" style={{ color: "var(--color-gray-1)" }}>{row.value}</span>}
                  <ChevronIcon />
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
                <LogoutIcon />
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
function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SettingsIcon({ name, color }: { name: IconName; color: string }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "account":
      return <svg {...c}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "privacy":
      return <svg {...c}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
    case "notifications":
      return <svg {...c}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
    case "chats":
      return <svg {...c}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
    case "storage":
      return <svg {...c}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
    case "appearance":
      return <svg {...c}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>;
    case "language":
      return <svg {...c}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>;
    case "help":
      return <svg {...c}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 115.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "about":
      return <svg {...c}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
  }
}
