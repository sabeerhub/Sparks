"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, Laptop, Tablet, Monitor, LogOut, Mail, CheckCircle2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { SettingsHeader, SectionLabel, SettingsCard, RowDivider } from "@/components/settings/settings-ui";
import { useAuth } from "@/hooks/useAuth";
import { listSessions, revokeSession, revokeAllOtherSessions } from "@/services/session-service";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { DeviceSessionItem } from "@/types";

const supabase = createClient();

function DeviceIcon({ type }: { type: DeviceSessionItem["device_type"] }) {
  const props = { size: 19, color: "var(--color-blue)", strokeWidth: 1.8 };
  switch (type) {
    case "mobile": return <Smartphone {...props} />;
    case "tablet": return <Tablet {...props} />;
    case "desktop": return <Laptop {...props} />;
    default: return <Monitor {...props} />;
  }
}

export default function SecurityCenterPage() {
  const router = useRouter();
  const { logout, logoutAllDevices } = useAuth();
  const [sessions, setSessions] = useState<DeviceSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);

  useEffect(() => {
    (async () => {
      const [sessionList, { data: { user } }] = await Promise.all([
        listSessions().catch(() => []),
        supabase.auth.getUser(),
      ]);
      setSessions(sessionList);
      setEmailVerified(!!user?.email_confirmed_at);
      setLoading(false);
    })();
  }, []);

  const handleRevoke = async (id: string) => {
    await revokeSession(id).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleLogoutAll = async () => {
    if (!confirm("Log out of all other devices?")) return;
    await revokeAllOtherSessions().catch(() => {});
    await logoutAllDevices();
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  const handleLogoutCurrent = async () => {
    if (!confirm("Log out of this device?")) return;
    await logout();
    router.push("/");
  };

  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <SettingsHeader title="Security Center" />

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-6">
          {/* Hero — account status, glass tile with sheen. */}
          <div className="glass-card glass-sheen rounded-[28px] px-5 py-7 flex flex-col items-center text-center">
            <div className="glass w-[76px] h-[76px] rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(52,199,89,0.14)" }}>
              <Shield size={36} color="var(--color-green)" strokeWidth={1.7} />
            </div>
            <h2 className="text-title font-bold">Your account is secure</h2>
            <p className="text-body mt-1" style={{ color: "var(--color-gray-1)" }}>
              {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
              {emailVerified ? " · Email verified" : " · Email not verified"}
            </p>
          </div>

          <div>
            <SectionLabel>Verification</SectionLabel>
            <SettingsCard>
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: emailVerified ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.12)" }}>
                  <Mail size={19} color={emailVerified ? "var(--color-green)" : "var(--color-orange)"} strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <div className="text-body font-medium">Email Verification</div>
                  <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>
                    {emailVerified ? "Your email address is verified." : "Your email address is not verified yet."}
                  </div>
                </div>
                {emailVerified && <CheckCircle2 size={20} color="var(--color-green)" strokeWidth={1.8} className="flex-shrink-0" />}
              </div>
            </SettingsCard>
          </div>

          <div>
            <SectionLabel>Active Devices</SectionLabel>
            <SettingsCard>
              {loading ? (
                <div className="px-4 py-5 text-body" style={{ color: "var(--color-gray-1)" }}>Loading devices…</div>
              ) : sessions.length === 0 ? (
                <div className="px-4 py-5">
                  <div className="text-body font-medium">No active sessions found</div>
                  <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>Devices you sign in on will appear here.</div>
                </div>
              ) : (
                sessions.map((s, i) => (
                  <div key={s.id}>
                    {i > 0 && <RowDivider />}
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.1)" }}>
                        <DeviceIcon type={s.device_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body font-medium truncate">
                          {s.device_label}
                          {s.isCurrent && <span style={{ color: "var(--color-green)" }}> · This device</span>}
                        </div>
                        <div className="text-caption truncate mt-0.5" style={{ color: "var(--color-gray-1)" }}>
                          {[s.location_city, s.location_country].filter(Boolean).join(", ") || "Unknown location"} · Active {formatLastSeen(s.last_active_at)}
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <button onClick={() => handleRevoke(s.id)} className="glass pressable px-3.5 py-1.5 rounded-full text-caption font-semibold flex-shrink-0" style={{ color: "var(--color-red)" }}>
                          Log out
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </SettingsCard>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/settings/account")}
              className="glass pressable w-full py-3.5 rounded-full text-body font-semibold"
              style={{ color: "var(--color-blue)" }}
            >
              Change Password
            </button>
            <button
              onClick={handleLogoutAll}
              className="pressable w-full py-3.5 rounded-full text-body font-semibold text-white"
              style={{ background: "var(--color-red)" }}
            >
              Log Out All Other Devices
            </button>
            <button
              onClick={handleLogoutCurrent}
              className="pressable w-full flex items-center justify-center gap-2 py-3 rounded-full text-body font-semibold"
              style={{ color: "var(--color-red)" }}
            >
              <LogOut size={17} strokeWidth={1.8} /> Log Out This Device
            </button>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
