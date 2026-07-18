"use client";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function AboutPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-bold ml-3">About Sparks</h1>
        </div>
        <div className="flex-1 flex flex-col items-center pt-10 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--color-blue)" }}>
            <Zap size={28} fill="white" color="white" />
          </div>
          <h2 className="text-lg font-bold mb-1">Spark Chat</h2>
          <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>Version 1.0.0</p>
          <p className="text-sm mt-4" style={{ color: "var(--color-gray-1)" }}>Private, secure, real-time messaging.</p>
        </div>
      </div>
    </ScreenContainer>
  );
}
