"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCall } from "@/hooks/useCall";
import { subscribeToIncomingCalls } from "@/services/call-service";
import { CallScreen } from "@/components/call/CallScreen";
import { createClient } from "@/lib/supabase";
import type { CallType } from "@/services/call-service";

const supabase = createClient();

interface CallContextValue {
  placeCall: (targetUserId: string, targetName: string, targetAvatar: string | null, callType: CallType) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallActions(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallActions must be used within CallProvider");
  return ctx;
}

/**
 * Mounted once at the app root. Owns the single active call for the whole
 * app session: listens for incoming calls on any screen, and exposes
 * placeCall() so any component (chat header, profile page) can start an
 * outgoing call without needing its own WebRTC plumbing.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const call = useCall();
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null } | null>(null);

  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribeIncoming: (() => void) | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserIdRef.current = user.id;

      unsubscribeIncoming = subscribeToIncomingCalls(user.id, async (incomingRow) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: callerProfile } = await (supabase.from("profiles") as any)
          .select("full_name, avatar_url")
          .eq("id", incomingRow.caller_id)
          .maybeSingle();

        setOtherUser({
          name: callerProfile?.full_name ?? "Unknown",
          avatar: callerProfile?.avatar_url ?? null,
        });
        call.setIncoming(incomingRow, callerProfile?.full_name ?? "Unknown", callerProfile?.avatar_url ?? null);
      });
    };

    setup();

    return () => { unsubscribeIncoming?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeCall = (targetUserId: string, targetName: string, targetAvatar: string | null, callType: CallType) => {
    setOtherUser({ name: targetName, avatar: targetAvatar });
    call.startCall(targetUserId, callType);
  };

  const displayName = call.incomingCall?.callerName ?? otherUser?.name ?? "";
  const displayAvatar = call.incomingCall?.callerAvatar ?? otherUser?.avatar ?? null;

  return (
    <CallContext.Provider value={{ placeCall }}>
      {children}
      <CallScreen
        phase={call.phase}
        callType={call.callType}
        otherUserName={displayName}
        otherUserAvatar={displayAvatar}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        muted={call.muted}
        cameraOff={call.cameraOff}
        speakerOn={call.speakerOn}
        callDurationSec={call.callDurationSec}
        error={call.error}
        onAccept={call.acceptIncoming}
        onDecline={call.declineIncoming}
        onHangUp={call.hangUp}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        onSwitchCamera={call.switchCamera}
        onToggleSpeaker={call.toggleSpeaker}
      />
    </CallContext.Provider>
  );
}
