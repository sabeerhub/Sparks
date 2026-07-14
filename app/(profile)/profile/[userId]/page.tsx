"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, Zap, MapPin, Send } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase";
import { getSparkCount, startDirectChat } from "@/services/chat-service";
import { getSparkStatus, sendSparkRequest, hasAcceptedSpark } from "@/services/spark-service";
import type { Profile, SparkRequest } from "@/types";

const supabase = createClient();

type ConnectionState = "loading" | "self" | "none" | "pending_sent" | "pending_received" | "connected";

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sparkCount, setSparkCount] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("profiles") as any)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setProfile(data as Profile | null);
    getSparkCount(userId).then(setSparkCount);

    if (user?.id === userId) {
      setConnection("self");
    } else {
      const connected = await hasAcceptedSpark(userId);
      if (connected) {
        setConnection("connected");
      } else {
        const status = await getSparkStatus(userId) as SparkRequest | null;
        if (!status) setConnection("none");
        else if (status.status === "pending" && status.sender_id === user?.id) setConnection("pending_sent");
        else if (status.status === "pending") setConnection("pending_received");
        else setConnection("none");
      }
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSendSpark = async () => {
    setBusy(true);
    try {
      await sendSparkRequest(userId);
      setConnection("pending_sent");
    } catch {
      // Silently keep current state — a toast/error UI can be added later.
    } finally {
      setBusy(false);
    }
  };

  const handleStartChat = async () => {
    setBusy(true);
    try {
      const chatId = await startDirectChat(userId);
      router.push(`/chats/${chatId}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !profile) {
    return (
      <ScreenContainer>
        <StatusBar />
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex items-center px-4 py-3 bg-white border-b" style={{ borderColor: "var(--color-gray-2)" }}>
          <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: "var(--color-blue)" }}>
            Back
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center py-8 px-5 bg-white">
            <div
              className="rounded-full p-1"
              style={profile.is_premium ? { background: "linear-gradient(135deg, var(--color-orange), var(--color-blue))" } : undefined}
            >
              <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={92} online={profile.is_online} />
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <h2 className="text-xl font-bold text-center">{profile.full_name}</h2>
              {profile.is_verified && <BadgeCheck size={18} fill="var(--color-blue)" color="white" />}
            </div>

            <p className="text-sm mt-0.5" style={{ color: "var(--color-blue)" }}>@{profile.username}</p>

            <div className="mt-4 flex items-center gap-1.5">
              <Zap size={18} fill="var(--color-blue)" color="var(--color-blue)" />
              <span className="text-xl font-bold">{sparkCount}</span>
            </div>
            <p className="text-xs -mt-0.5" style={{ color: "var(--color-gray-1)" }}>Total Sparks</p>

            {profile.bio && (
              <p className="text-sm mt-3 text-center max-w-xs" style={{ color: "var(--color-gray-1)" }}>
                {profile.bio}
              </p>
            )}

            {profile.location && (
              <span className="flex items-center gap-1 mt-3 text-xs" style={{ color: "var(--color-gray-1)" }}>
                <MapPin size={12} strokeWidth={1.8} /> {profile.location}
              </span>
            )}

            <div className="mt-6 w-full max-w-xs">
              {connection === "connected" && (
                <button
                  onClick={handleStartChat}
                  disabled={busy}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--color-blue)" }}
                >
                  {busy ? "Opening…" : "Message"}
                </button>
              )}
              {connection === "none" && (
                <button
                  onClick={handleSendSpark}
                  disabled={busy}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "var(--color-blue)" }}
                >
                  <Send size={16} color="white" strokeWidth={2} /> {busy ? "Sending…" : "Send Spark Request"}
                </button>
              )}
              {connection === "pending_sent" && (
                <button disabled className="w-full py-3 rounded-2xl text-sm font-semibold" style={{ background: "var(--color-gray-2)", color: "var(--color-gray-1)" }}>
                  Spark Request Sent
                </button>
              )}
              {connection === "pending_received" && (
                <button onClick={() => router.push("/activity")} className="w-full py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: "var(--color-blue)" }}>
                  Respond to Spark Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
