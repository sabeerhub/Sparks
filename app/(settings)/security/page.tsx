"use client";

import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const ITEMS: { label: string; desc: string; icon: "lock" | "eye" | "shield"; color: string }[] = [
  { label: "End-to-End Encryption", desc: "Messages are protected", icon: "lock", color: "var(--color-green)" },
  { label: "Logged-in Devices", desc: "3 active sessions", icon: "eye", color: "var(--color-blue)" },
  { label: "Account Security", desc: "Strong", icon: "shield", color: "var(--color-green)" },
];

export default function SecurityCenterPage() {
  const router = useRouter();
  const { logoutAllDevices } = useAuth();

  const handleLogoutAll = async () => {
    if (!confirm("Log out of all devices? You'll need to verify your email again everywhere.")) return;
    await logoutAllDevices();
    router.push("/");
  };

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold ml-3">Security Center</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#E8F9EF" }}>
              <ShieldIcon />
            </div>
            <h2 className="text-lg font-bold mb-1">Your account is secure</h2>
            <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>Last security check: Today, 9:41 AM</p>
          </div>

          <div className="rounded-2xl overflow-hidden mb-4 bg-white">
            {ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-4 border-b last:border-0" style={{ borderColor: "var(--color-gray-2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20` }}>
                  <SecurityRowIcon name={item.icon} color={item.color} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>{item.desc}</div>
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--color-green)" }}>
                  <CheckIcon />
                </div>
              </div>
            ))}
          </div>

          <Button variant="danger" fullWidth onClick={handleLogoutAll}>
            Log Out All Devices
          </Button>
        </div>
      </div>
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function ShieldIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function SecurityRowIcon({ name, color }: { name: "lock" | "eye" | "shield"; color: string }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "lock") return <svg {...c}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
  if (name === "eye") return <svg {...c}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
  return <svg {...c}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
