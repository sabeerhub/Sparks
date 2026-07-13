"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  getSparkStatus,
  sendSparkRequest,
  respondToSparkRequest,
} from "@/services/spark-service";
import { startDirectChat } from "@/services/chat-service";
import type { SparkRequest } from "@/types";

interface Props {
  targetUserId: string;
  currentUserId: string;
  compact?: boolean;
}

export function SparkRequestButton({ targetUserId, currentUserId, compact = false }: Props) {
  const router = useRouter();
  const [request, setRequest] = useState<SparkRequest | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSparkStatus(targetUserId).then(setRequest);
  }, [targetUserId]);

  if (request === undefined) {
    return (
      <div
        className="h-9 rounded-2xl animate-pulse"
        style={{ background: "var(--color-gray-3)", width: compact ? 100 : 140 }}
      />
    );
  }

  const isIncoming = request?.receiver_id === currentUserId && request?.status === "pending";
  const isOutgoing = request?.sender_id === currentUserId && request?.status === "pending";
  const isAccepted = request?.status === "accepted";

  const handleSendSpark = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendSparkRequest(targetUserId);
      setRequest(result);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Could not send request.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      const chatId = await respondToSparkRequest(request.id, accept);
      if (accept && chatId) {
        router.push(`/chats/${chatId}`);
      } else {
        setRequest((prev) => prev ? { ...prev, status: "declined" } : prev);
      }
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Could not respond.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    setLoading(true);
    try {
      const chatId = await startDirectChat(targetUserId);
      router.push(`/chats/${chatId}`);
    } catch {
      setError("Could not open chat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {isAccepted ? (
        <Button
          onClick={handleMessage}
          loading={loading}
          variant="primary"
          fullWidth={!compact}
          className={compact ? "px-4 py-2 text-xs" : ""}
        >
          Message
        </Button>
      ) : isIncoming ? (
        <div className="flex gap-2">
          <Button
            onClick={() => handleRespond(true)}
            loading={loading}
            variant="primary"
            className={compact ? "px-3 py-2 text-xs flex-1" : "flex-1"}
          >
            Accept
          </Button>
          <Button
            onClick={() => handleRespond(false)}
            loading={loading}
            variant="secondary"
            className={compact ? "px-3 py-2 text-xs flex-1" : "flex-1"}
          >
            Decline
          </Button>
        </div>
      ) : isOutgoing ? (
        <button
          disabled
          className={`rounded-2xl font-medium text-center ${compact ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm w-full"}`}
          style={{ background: "var(--color-gray-2)", color: "var(--color-gray-1)" }}
        >
          Request Sent
        </button>
      ) : (
        <Button
          onClick={handleSendSpark}
          loading={loading}
          variant="primary"
          fullWidth={!compact}
          className={compact ? "px-4 py-2 text-xs" : ""}
        >
          ⚡ Send Spark
        </Button>
      )}

      {error && (
        <p className="text-xs text-center" style={{ color: "var(--color-red)" }}>{error}</p>
      )}
    </div>
  );
}
