"use client";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function HelpSupportPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="frosted-header flex items-center px-4 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back" className="pressable w-11 h-11 -ml-2 rounded-full flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-title font-bold ml-3">Help & Support</h1>
        </div>
        <div className="flex-1 px-4 space-y-3">
          <a href="mailto:support@sparkschat.app" className="rounded-2xl bg-white p-4 flex items-center gap-3">
            <Mail size={20} color="var(--color-blue)" strokeWidth={1.8} />
            <div>
              <div className="text-body font-semibold">Email Support</div>
              <div className="text-caption" style={{ color: "var(--color-gray-1)" }}>support@sparkschat.app</div>
            </div>
          </a>
        </div>
      </div>
    </ScreenContainer>
  );
}
