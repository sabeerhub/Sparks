"use client";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function LanguageSettingsPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <div className="frosted-header flex items-center px-4 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back" className="pressable w-11 h-11 -ml-2 rounded-full flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-title font-bold ml-3">Language</h1>
        </div>
        <div className="flex-1 px-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="flex-1 text-body font-medium">English</span>
              <Check size={18} color="var(--color-blue)" strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
