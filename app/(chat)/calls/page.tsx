"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCallHistory, type CallHistoryItem } from "@/services/call-service";
import { useCallActions } from "@/components/call/CallProvider";
import { formatChatListTime } from "@/utils/helpers";

function formatCallDuration(item: CallHistoryItem): string {
  if (!item.answered_at || !item.ended_at) return "";
  const seconds = Math.max(0, Math.round((new Date(item.ended_at).getTime() - new Date(item.answered_at).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}

function callLabel(item: CallHistoryItem): string {
  if (item.status === "missed") return "Missed call";
  if (item.status === "declined") return item.isOutgoing ? "Declined" : "Declined call";
  const duration = formatCallDuration(item);
  if (item.status === "ended" || item.status === "accepted") return duration || "Call";
  return "Call";
}

export default function CallsPage() {
  const router = useRouter();
  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { placeCall } = useCallActions();

  useEffect(() => {
    let cancelled = false;
    fetchCallHistory(50)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-surface h-full w-full">
      <div className="flex flex-col h-full">
        <StatusBar />

        <div className="frosted-header px-4 pt-4 pb-3">
          <h1 className="text-title font-bold">Calls</h1>
          <p className="text-body mt-1" style={{ color: "var(--color-gray-1)" }}>
            Your voice and video call history
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {loading && (
            <div className="glass-card rounded-[24px] overflow-hidden px-4 py-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
                    <div className="h-3 w-20 rounded-full" style={{ background: "var(--color-gray-3)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && history.length === 0 && (
            <EmptyState
              wordmark
              title="No calls yet"
              subtitle="Calls you make or receive will show up here."
              actionLabel="Find People to Call"
              onAction={() => router.push("/search")}
            />
          )}

          {!loading && history.length > 0 && (
            <div className="glass-card rounded-[24px] overflow-hidden">
              {history.map((item, i) => {
                const missed = item.status === "missed";
                const DirectionIcon = missed ? PhoneMissed : item.isOutgoing ? PhoneOutgoing : PhoneIncoming;
                return (
                  <div key={item.id}>
                    {i > 0 && <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />}
                    <div className="glass-row w-full flex items-center gap-3 px-4 py-4 text-left">
                      <Avatar name={item.otherUserName} src={item.otherUserAvatar} size={48} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-body truncate">{item.otherUserName}</p>
                        <p className="text-body flex items-center gap-1.5 mt-0.5" style={{ color: missed ? "var(--color-red)" : "var(--color-gray-1)" }}>
                          <DirectionIcon size={14} strokeWidth={2} />
                          <span className="truncate">{callLabel(item)}</span>
                          <span aria-hidden>·</span>
                          <span className="flex-shrink-0">{formatChatListTime(item.started_at)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => placeCall(item.otherUserId, item.otherUserName, item.otherUserAvatar, item.call_type)}
                        aria-label={`Call ${item.otherUserName} back`}
                        className="glass pressable w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      >
                        {item.call_type === "video" ? (
                          <Video size={20} color="var(--color-blue)" strokeWidth={1.8} />
                        ) : (
                          <Phone size={20} color="var(--color-blue)" strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
