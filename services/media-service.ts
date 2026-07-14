/**
 * services/media-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Uploads media (images, files, voice notes) to the private `chat-media`
 * Storage bucket, then sends a message row pointing at it via the existing
 * send_message RPC. Storage RLS requires the path's first folder segment
 * to be the chat_id (see migration policies: storage_insert_chat_member).
 */

import { createClient } from "@/lib/supabase";
import { canSendMessage, msUntilNextMessageSlot, RateLimitError } from "@/lib/rateLimit";
import type { DecryptedMessage } from "@/types";

const supabase = createClient();

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25MB

export type MediaKind = "image" | "file" | "voice";

function kindFromMimeType(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "voice";
  return "file";
}

interface SendMediaParams {
  chatId: string;
  file: File | Blob;
  fileName: string;
  mimeType: string;
  replyToId?: string | null;
}

/**
 * Uploads a file to chat-media/{chatId}/{timestamp}-{filename}, then sends
 * a message row referencing it. Returns the message the UI should render.
 */
export async function sendMediaMessage({
  chatId,
  file,
  fileName,
  mimeType,
  replyToId = null,
}: SendMediaParams): Promise<DecryptedMessage> {
  if (!canSendMessage(chatId)) {
    throw new RateLimitError(msUntilNextMessageSlot(chatId));
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${chatId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (uploadError) throw uploadError;

  const contentType = kindFromMimeType(mimeType);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("send_message", {
    p_chat_id: chatId,
    p_content: fileName, // shown as the file's display name / caption
    p_content_type: contentType,
    p_media_path: path,
    p_reply_to_id: replyToId,
  });

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  return {
    id: data as string,
    chat_id: chatId,
    sender_id: user!.id,
    text: fileName,
    content_type: contentType,
    media_url: path,
    reply_to_id: replyToId,
    edited_at: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    status: "sent",
  };
}

/**
 * chat-media is a private bucket — files need a signed URL to view/download,
 * not a permanent public URL. Signed URLs expire (1 hour here), which is
 * fine since this is called fresh each time a message renders.
 */
export async function getMediaUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
