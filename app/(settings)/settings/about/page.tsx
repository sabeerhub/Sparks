"use client";
import { useRouter } from "next/navigation";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function AboutPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <div className="frosted-header flex items-center px-4 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back" className="pressable w-11 h-11 -ml-2 rounded-full flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-title font-bold ml-3">About Sparks</h1>
        </div>
        <div className="flex-1 flex flex-col items-center pt-10 px-8 text-center">
          <div className="glass-card rounded-[28px] px-8 py-8 flex flex-col items-center w-full max-w-xs">
            <SparkWordmark size="medium" animate />
            <p className="text-body mt-4" style={{ color: "var(--color-gray-1)" }}>Version 1.3.0</p>
            <p className="text-body mt-4" style={{ color: "var(--color-gray-1)" }}>Private, secure, real-time messaging.</p>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
