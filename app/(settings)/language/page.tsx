"use client";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function LanguageSettingsPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-bold ml-3">Language</h1>
        </div>
        <div className="flex-1 px-5">
          <div className="rounded-2xl overflow-hidden bg-white">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex-1 text-sm font-medium">English</span>
              <Check size={18} color="var(--color-blue)" strokeWidth={2.2} />
            </div>
          </div>
          <p className="text-xs mt-3 px-1" style={{ color: "var(--color-gray-1)" }}>More languages coming soon.</p>
        </div>
      </div>
    </ScreenContainer>
  );
}
