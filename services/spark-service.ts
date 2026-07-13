/**
 * services/spark-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * All Spark Request operations. Spark Requests are the connection-request
 * gate that must be accepted before two users can chat.
 */

import { createClient } from "@/lib/supabase";
import type { SparkRequest, SparkRequestWithProfile, Profile } from "@/types";

const supabase = createClient();

export async function getSparkStatus(otherUserId: string): Promise<SparkRequest | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("spark_requests") as any)
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .maybeSingle();

  return data as SparkRequest | null;
}

export async function getIncomingRequests(): Promise<SparkRequestWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests, error } = await (supabase.from("spark_requests") as any)
    .select("*")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !requests?.length) return [];

  const senderIds = (requests as SparkRequest[]).map((r) => r.sender_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles") as any)
    .select("*")
    .in("id", senderIds);

  const profileMap = new Map<string, Profile>();
  (profiles ?? []).forEach((p: Profile) => profileMap.set(p.id, p));

  return (requests as SparkRequest[])
    .map((r): SparkRequestWithProfile | null => {
      const profile = profileMap.get(r.sender_id);
      if (!profile) return null;
      return { ...r, profile, direction: "incoming" };
    })
    .filter((r): r is SparkRequestWithProfile => r !== null);
}

export async function getOutgoingRequests(): Promise<SparkRequestWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests, error } = await (supabase.from("spark_requests") as any)
    .select("*")
    .eq("sender_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !requests?.length) return [];

  const receiverIds = (requests as SparkRequest[]).map((r) => r.receiver_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles") as any)
    .select("*")
    .in("id", receiverIds);

  const profileMap = new Map<string, Profile>();
  (profiles ?? []).forEach((p: Profile) => profileMap.set(p.id, p));

  return (requests as SparkRequest[])
    .map((r): SparkRequestWithProfile | null => {
      const profile = profileMap.get(r.receiver_id);
      if (!profile) return null;
      return { ...r, profile, direction: "outgoing" };
    })
    .filter((r): r is SparkRequestWithProfile => r !== null);
}

export async function sendSparkRequest(
  receiverId: string,
  message?: string
): Promise<SparkRequest> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("send_spark_request", {
    p_receiver_id: receiverId,
    p_message: message ?? null,
  });
  if (error) throw error;
  return data as SparkRequest;
}

export async function respondToSparkRequest(
  requestId: string,
  accept: boolean
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("respond_to_spark_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as string | null;
}

export async function hasAcceptedSpark(otherUserId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("has_accepted_spark", {
    p_other_user_id: otherUserId,
  });
  if (error) return false;
  return data === true;
}
