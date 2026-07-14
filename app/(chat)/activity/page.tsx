"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Zap, BadgeCheck, AtSign, Trash2, X } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import {
  getIncomingRequests,
  getOutgoingRequests,
  respondToSparkRequest,
} from "@/services/spark-service";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/services/notification-service";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { SparkRequestWithProfile, AppNotification } from "@/types";

const supabase = createClient();

type Tab = "notifications" | "incoming" | "outgoing";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-3 w-16 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
    </div>
  );
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  const wrap = (bg: string, children: React.ReactNode) => (
    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      {children}
    </div>
  );
  switch (type) {
    case "message": return wrap("rgba(0,122,255,0.12)", <MessageCircle size={19} color="var(--color-blue)" strokeWidth={1.8} />);
    case "spark_request": return wrap("rgba(0,122,255,0.12)", <Zap size={19} color="var(--color-blue)" fill="var(--color-blue)" />);
    case "spark_accepted": return wrap("rgba(52,199,89,0.12)", <BadgeCheck size={19} color="var(--color-green)" />);
    case "mention": return wrap("rgba(255,149,0,0.12)", <AtSign size={19} color="var(--color-orange)" strokeWidth={1.8} />);
  }
}

function NotificationRow({ n, onOpen, onDelete }: { n: AppNotification; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3.5 border-b active:bg-gray-50"
      style={{ borderColor: "var(--color-gray-2)", background: n.is_read ? "transparent" : "rgba(0,122,255,0.04)" }}
    >
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <NotificationIcon type={n.type} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{n.title}</p>
          {n.body && <p className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>{n.body}</p>}
          <p className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>{formatLastSeen(n.created_at)}</p>
        </div>
        {!n.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--color-blue)" }} />}
      </button>
      <button onClick={onDelete} aria-label="Delete notification" className="p-1.5 flex-shrink-0">
        <X size={16} color="var(--color-gray-1)" strokeWidth={2} />
      </button>
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

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
      <div className="mb-4">{icon}</div>
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>{subtitle}</p>
    </div>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notifications");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [incoming, setIncoming] = useState<SparkRequestWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<SparkRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [notifs, inc, out] = await Promise.all([
      fetchNotifications(),
      getIncomingRequests(),
      getOutgoingRequests(),
    ]);
    setNotifications(notifs);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("activity-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "spark_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
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

  const handleOpenNotification = async (n: AppNotification) => {
    await markNotificationRead(n.id).catch(() => {});
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    if (n.type === "message" && n.related_chat_id) {
      router.push(`/chats/${n.related_chat_id}`);
    } else if ((n.type === "spark_request" || n.type === "spark_accepted") && n.related_user_id) {
      router.push(`/profile/${n.related_user_id}`);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead().catch(() => {});
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all notifications? This can't be undone.")) return;
    setNotifications([]);
    await clearAllNotifications().catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Activity</h1>
            {tab === "notifications" && notifications.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-semibold" style={{ color: "var(--color-blue)" }}>
                    Mark all read
                  </button>
                )}
                <button onClick={handleClearAll} className="text-xs font-semibold" style={{ color: "var(--color-red)" }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {([
              { key: "notifications" as Tab, label: "Notifications", count: unreadCount },
              { key: "incoming" as Tab, label: "Received", count: incoming.length },
              { key: "outgoing" as Tab, label: "Sent", count: outgoing.length },
            ]).map(({ key, label, count }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0"
                  style={{ background: active ? "var(--color-blue)" : "var(--color-gray-2)", color: active ? "#fff" : "var(--color-gray-1)" }}
                >
                  {label}
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
          {loading && <><RowSkeleton /><RowSkeleton /><RowSkeleton /></>}

          {!loading && tab === "notifications" && (
            notifications.length === 0
              ? <EmptyState icon={<MessageCircle size={40} color="var(--color-gray-3)" strokeWidth={1.5} />} title="No notifications yet" subtitle="New messages, Spark requests, and updates will appear here." />
              : notifications.map((n) => (
                  <NotificationRow key={n.id} n={n} onOpen={() => handleOpenNotification(n)} onDelete={() => handleDeleteNotification(n.id)} />
                ))
          )}

          {!loading && tab === "incoming" && (
            incoming.length === 0
              ? <EmptyState icon={<Zap size={40} color="var(--color-gray-3)" />} title="No spark requests" subtitle="When someone sends you a Spark Request, it will appear here." />
              : incoming.map((r) => <IncomingRow key={r.id} request={r} onRespond={handleRespond} />)
          )}

          {!loading && tab === "outgoing" && (
            outgoing.length === 0
              ? <EmptyState icon={<Zap size={40} color="var(--color-gray-3)" />} title="No pending requests" subtitle="Requests you've sent that haven't been accepted yet will appear here." />
              : outgoing.map((r) => <OutgoingRow key={r.id} request={r} />)
          )}
          <div className="h-4" />
        </div>

        <BottomNav />
      </div>
    </ScreenContainer>
  );
}
