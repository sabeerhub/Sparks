"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, Laptop, Tablet, Monitor, LogOut, Mail } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { listSessions, revokeSession, revokeAllOtherSessions } from "@/services/session-service";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { DeviceSessionItem } from "@/types";

const supabase = createClient();

function DeviceIcon({ type }: { type: DeviceSessionItem["device_type"] }) {
  const props = { size: 18, color: "var(--color-blue)", strokeWidth: 1.8 };
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
        <div className="frosted-header flex items-center px-4 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back" className="pressable w-11 h-11 -ml-2 rounded-full flex items-center justify-center">
            <BackIcon />
          </button>
          <h1 className="text-title font-bold ml-3">Security Center</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#E8F9EF" }}>
              <Shield size={36} color="var(--color-green)" strokeWidth={1.8} />
            </div>
            <h2 className="text-body font-bold mb-1">Your account is secure</h2>
            <p className="text-body" style={{ color: "var(--color-gray-1)" }}>
              {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: emailVerified ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.12)" }}>
                <Mail size={18} color={emailVerified ? "var(--color-green)" : "var(--color-orange)"} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <div className="text-body font-semibold">Email Verification</div>
                <div className="text-caption" style={{ color: "var(--color-gray-1)" }}>
                  {emailVerified ? "Verified" : "Not verified"}
                </div>
              </div>
            </div>
          </div>

          <p className="text-caption font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>
            Active Devices
          </p>
          <div className="glass-card rounded-2xl overflow-hidden mb-4">
            {loading ? (
              <div className="px-4 py-4 text-body" style={{ color: "var(--color-gray-1)" }}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-4 text-body" style={{ color: "var(--color-gray-1)" }}>No active sessions found.</div>
            ) : (
              sessions.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: i < sessions.length - 1 ? "1px solid var(--color-gray-2)" : "none" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,122,255,0.1)" }}>
                    <DeviceIcon type={s.device_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-semibold truncate">
                      {s.device_label}{s.isCurrent && <span style={{ color: "var(--color-green)" }}> · This device</span>}
                    </div>
                    <div className="text-caption truncate" style={{ color: "var(--color-gray-1)" }}>
                      {[s.location_city, s.location_country].filter(Boolean).join(", ") || "Unknown location"} · Active {formatLastSeen(s.last_active_at)}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button onClick={() => handleRevoke(s.id)} className="text-caption font-semibold flex-shrink-0" style={{ color: "var(--color-red)" }}>
                      Log out
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <Button variant="secondary" fullWidth onClick={() => router.push("/settings/account")}>
              Change Password
            </Button>
            <Button variant="danger" fullWidth onClick={handleLogoutAll}>
              Log Out All Other Devices
            </Button>
            <button
              onClick={handleLogoutCurrent}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-body font-semibold"
              style={{ color: "var(--color-red)" }}
            >
              <LogOut size={16} strokeWidth={1.8} /> Log Out This Device
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
