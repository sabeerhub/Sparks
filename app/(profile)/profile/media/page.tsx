"use client";

import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SharedMediaPage() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <StatusBar />
      <div className="frosted-header flex items-center px-4 py-3">
        <button onClick={() => router.back()} className="text-body font-medium mr-3" style={{ color: "var(--color-blue)" }}>
          Back
        </button>
        <h1 className="text-title font-semibold">Shared Media</h1>
      </div>
      <EmptyState title="No media yet" subtitle="Photos and files shared in your chats will appear here." />
    </ScreenContainer>
  );
}
