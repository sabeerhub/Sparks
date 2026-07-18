"use client";
import { useRouter } from "next/navigation";
import { Mail, MessageCircleQuestion } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function HelpSupportPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-5 pt-2 pb-3">
          <button onClick={() => router.back()} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-xl font-bold ml-3">Help & Support</h1>
        </div>
        <div className="flex-1 px-5 space-y-3">
          <a href="mailto:support@sparkschat.app" className="rounded-2xl bg-white p-4 flex items-center gap-3">
            <Mail size={20} color="var(--color-blue)" strokeWidth={1.8} />
            <div>
              <div className="text-sm font-semibold">Email Support</div>
              <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>support@sparkschat.app</div>
            </div>
          </a>
          <div className="rounded-2xl bg-white p-4 flex items-center gap-3">
            <MessageCircleQuestion size={20} color="var(--color-blue)" strokeWidth={1.8} />
            <div>
              <div className="text-sm font-semibold">FAQ</div>
              <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>Coming soon</div>
            </div>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
