"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import {
  getIncomingRequests,
  getOutgoingRequests,
  respondToSparkRequest,
} from "@/services/spark-service";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { SparkRequestWithProfile } from "@/types";

const supabase = createClient();

type Tab = "incoming" | "outgoing";

function RequestSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-3 w-16 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-2xl" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-8 w-16 rounded-2xl" style={{ background: "var(--color-gray-3)" }} />
      </div>
    </div>
  );
}

function IncomingRow({ request, onRespond }: { request: SparkRequestWithProfile; onRespond: (id: string, accept: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async (accept: boolean) => { setLoading(true); await onRespond(request.id, accept); setLoading(false); };

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
      <Avatar name={request.profile.full_name} src={request.profile.avatar_url} size={48} online={request.profile.is_online} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{request.profile.full_name}</p>
        <p className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>@{request.profile.username}</p>
        {request.message && (
          <p className="text-xs mt-0.5 italic truncate" style={{ color: "var(--color-gray-1)" }}>&quot;{request.message}&quot;</p>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => handle(false)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "var(--color-gray-2)", color: "var(--color-gray-1)" }}
        >
          Decline
        </button>
        <button
          onClick={() => handle(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
          style={{ background: "var(--color-blue)" }}
        >
          {loading ? "…" : "Accept"}
        </button>
      </div>
    </div>
  );
}

function OutgoingRow({ request }: { request: SparkRequestWithProfile }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
      <Avatar name={request.profile.full_name} src={request.profile.avatar_url} size={48} online={request.profile.is_online} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{request.profile.full_name}</p>
        <p className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>@{request.profile.username}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>Sent {formatLastSeen(request.created_at)}</p>
      </div>
      <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: "rgba(0,122,255,0.1)", color: "var(--color-blue)" }}>
        Pending
      </span>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>{subtitle}</p>
    </div>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("incoming");
  const [incoming, setIncoming] = useState<SparkRequestWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<SparkRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, out] = await Promise.all([getIncomingRequests(), getOutgoingRequests()]);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("spark-requests-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "spark_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const handleRespond = async (requestId: string, accept: boolean) => {
    try {
      const chatId = await respondToSparkRequest(requestId, accept);
      if (accept && chatId) {
        router.push(`/chats/${chatId}`);
      } else {
        setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) { console.error(err); }
  };

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-2xl font-bold mb-4">Activity</h1>
          <div className="flex gap-2">
            {(["incoming", "outgoing"] as Tab[]).map((t) => {
              const count = t === "incoming" ? incoming.length : outgoing.length;
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{ background: active ? "var(--color-blue)" : "var(--color-gray-2)", color: active ? "#fff" : "var(--color-gray-1)" }}
                >
                  {t === "incoming" ? "Received" : "Sent"}
                  {count > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" style={{ background: active ? "rgba(255,255,255,0.3)" : "var(--color-blue)", color: "#fff" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <><RequestSkeleton /><RequestSkeleton /><RequestSkeleton /></>}

          {!loading && tab === "incoming" && (
            incoming.length === 0
              ? <EmptyState icon="⚡" title="No spark requests" subtitle="When someone sends you a Spark Request, it will appear here." />
              : incoming.map((r) => <IncomingRow key={r.id} request={r} onRespond={handleRespond} />)
          )}

          {!loading && tab === "outgoing" && (
            outgoing.length === 0
              ? <EmptyState icon="✈️" title="No pending requests" subtitle="Requests you've sent that haven't been accepted yet will appear here." />
              : outgoing.map((r) => <OutgoingRow key={r.id} request={r} />)
          )}
          <div className="h-4" />
        </div>

        <BottomNav />
      </div>
    </ScreenContainer>
  );
}
