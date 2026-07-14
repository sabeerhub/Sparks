"use client";

import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";

export default function SharedMediaPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
        <button onClick={() => router.back()} className="text-sm font-medium mr-3" style={{ color: "var(--color-blue)" }}>
          Back
        </button>
        <h1 className="text-base font-semibold">Shared Media</h1>
      </div>
      <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
        <p className="font-semibold mb-1">No media yet</p>
        <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>
          Photos and files shared in your chats will appear here.
        </p>
      </div>
    </ScreenContainer>
  );
}
