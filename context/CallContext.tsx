// context/CallContext.tsx
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, Vibration } from "react-native";
import type { MediaStream } from "react-native-webrtc";

let mediaDevices: any;
let RTCIceCandidate: any;
let RTCPeerConnection: any;
let RTCSessionDescription: any;

if (Platform.OS !== "web") {
  const webrtc = require("react-native-webrtc");
  mediaDevices = webrtc.mediaDevices;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
}

// ─── Configuration ──────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add TURN servers for production
  ],
};

// ─── Types ───────────────────────────────────────────────────────────
export type CallType = "audio" | "video";
export type CallStatus =
  | "idle"
  | "outgoing_ringing"
  | "incoming_ringing"
  | "active"
  | "ending";

export interface CallParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  chatId: string;
}

export interface CallState {
  callId: string;
  type: CallType;
  status: CallStatus;
  initiator: CallParticipant;
  recipient: CallParticipant;
  startedAt?: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
}

interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "hangup" | "busy" | "timeout";
  callId: string;
  callType: CallType;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  recipientId: string;
  chatId: string;
  payload?: any;
  timestamp: number;
}

interface CallContextType {
  callState: CallState;
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  initiateCall: (recipient: CallParticipant, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const generateCallId = () =>
  `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const CALL_TIMEOUT_MS = 30_000;

// ─── Context ─────────────────────────────────────────────────────────
const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>({
    callId: "",
    type: "audio",
    status: "idle",
    initiator: { userId: "", displayName: "", chatId: "" },
    recipient: { userId: "", displayName: "", chatId: "" },
    isMuted: false,
    isVideoOff: false,
    isSpeakerOn: true,
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callRecordIdRef = useRef<string | null>(null);
  const isInitiatorRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const isInCall =
    callState.status === "active" ||
    callState.status === "outgoing_ringing" ||
    callState.status === "incoming_ringing";

  // ── Utility functions (declared first since others depend on them) ──
  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    Vibration.cancel();
  }, []);

  const startIncomingVibration = useCallback(() => {
    stopVibration();
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Vibration.vibrate([400, 600], true);
    }
  }, [stopVibration]);

  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
  }, []);

  const resetCall = useCallback(() => {
    clearCallTimeout();
    stopVibration();
    cleanupWebRTC();
    setCallState({
      callId: "",
      type: "audio",
      status: "idle",
      initiator: { userId: "", displayName: "", chatId: "" },
      recipient: { userId: "", displayName: "", chatId: "" },
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
    });
    callRecordIdRef.current = null;
    isInitiatorRef.current = false;
  }, [clearCallTimeout, stopVibration, cleanupWebRTC]);

  const sendSignal = useCallback((signal: CallSignal) => {
    const channel = supabase.channel(`call-signal-${signal.recipientId}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "call_signal",
          payload: signal,
        });
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 1000);
      }
    });
  }, []);

  const insertCallMessage = useCallback(
    async (chatId: string, callerId: string, content: string) => {
      if (!user) return;
      try {
        await supabase.from("messages").insert({
          chat_id: chatId,
          sender_id: callerId,
          content,
          created_at: new Date().toISOString(),
          is_read: false,
        });
      } catch (err) {
        console.error("Failed to insert call message:", err);
      }
    },
    [user],
  );

  const saveCallRecord = useCallback(
    async (
      callId: string,
      chatId: string,
      type: CallType,
      callerId: string,
      calleeId: string,
    ) => {
      try {
        const { data, error } = await supabase
          .from("calls")
          .insert({
            call_id: callId,
            chat_id: chatId,
            caller_id: callerId,
            callee_id: calleeId,
            call_type: type,
            status: "ongoing",
            started_at: new Date().toISOString(),
            encrypted: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        callRecordIdRef.current = data.id;
      } catch {
        console.warn("Calls table not found – call record not saved.");
      }
    },
    [],
  );

  const updateCallRecord = useCallback(
    async (callId: string, status: string, durationSeconds?: number) => {
      if (!callRecordIdRef.current) return;
      try {
        const updateData: any = { status };
        if (status === "completed" && durationSeconds !== undefined) {
          updateData.ended_at = new Date().toISOString();
          updateData.duration_seconds = durationSeconds;
        } else {
          updateData.ended_at = new Date().toISOString();
        }
        await supabase
          .from("calls")
          .update(updateData)
          .eq("id", callRecordIdRef.current);
      } catch (err) {
        console.warn("Failed to update call record:", err);
      }
    },
    [],
  );

  // ── End Call ────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (!user || !isInCall) return;

    clearCallTimeout();
    stopVibration();

    const otherParty =
      callState.status === "outgoing_ringing" ||
      callState.initiator.userId === user.id
        ? callState.recipient
        : callState.initiator;

    let finalContent = "";
    if (callState.startedAt && callState.status === "active") {
      const durationSec = Math.floor((Date.now() - callState.startedAt) / 1000);
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      finalContent = `📞 Call ended · ${minutes}:${seconds.toString().padStart(2, "0")}`;
      await updateCallRecord(callState.callId, "completed", durationSec);
    } else {
      await updateCallRecord(callState.callId, "missed");
      finalContent = "📞 Call cancelled";
    }

    await insertCallMessage(
      callState.initiator.chatId,
      callState.initiator.userId,
      finalContent,
    );

    setCallState((prev) => ({ ...prev, status: "ending" }));

    sendSignal({
      type: "hangup",
      callId: callState.callId,
      callType: callState.type,
      senderId: user.id,
      senderName: user.name || user.email || "You",
      recipientId: otherParty.userId,
      chatId: otherParty.chatId,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      resetCall();
    }, 400);
  }, [
    user,
    isInCall,
    callState,
    clearCallTimeout,
    stopVibration,
    sendSignal,
    resetCall,
    insertCallMessage,
    updateCallRecord,
  ]);

  // ── Get Local Media ───────────────────────────────────────────────
  const getLocalStream = useCallback(async (type: CallType) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video",
      };
      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Failed to get local media:", error);
      throw error;
    }
  }, []);

  // ── WebRTC Setup ──────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS) as any;
    peerConnectionRef.current = pc;

    // Handle incoming tracks
    pc.addEventListener("track", (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    });

    // Handle ICE candidates
    pc.addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        const signal: CallSignal = {
          type: "ice-candidate",
          callId: callState.callId,
          callType: callState.type,
          senderId: user?.id || "",
          senderName: user?.name || user?.email || "You",
          recipientId: isInitiatorRef.current
            ? callState.recipient.userId
            : callState.initiator.userId,
          chatId: callState.initiator.chatId,
          payload: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
          timestamp: Date.now(),
        };
        sendSignal(signal);
      }
    });

    // Handle connection state changes
    pc.addEventListener("connectionstatechange", () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        console.log("Peer connection state:", pc.connectionState);
        if (callState.status === "active") {
          endCall();
        }
      }
    });

    return pc;
  }, [callState, user, sendSignal, endCall]);

  // ── Decline incoming call ──────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!user || callState.status !== "incoming_ringing") return;

    clearCallTimeout();
    stopVibration();

    await updateCallRecord(callState.callId, "declined");
    await insertCallMessage(
      callState.initiator.chatId,
      callState.initiator.userId,
      "📞 Missed call",
    );

    sendSignal({
      type: "busy",
      callId: callState.callId,
      callType: callState.type,
      senderId: user.id,
      senderName: user.name || user.email || "You",
      recipientId: callState.initiator.userId,
      chatId: callState.initiator.chatId,
      timestamp: Date.now(),
    });

    resetCall();
  }, [
    user,
    callState,
    clearCallTimeout,
    stopVibration,
    sendSignal,
    resetCall,
    insertCallMessage,
    updateCallRecord,
  ]);

  // ── Accept incoming call ───────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!user || callState.status !== "incoming_ringing") return;

    clearCallTimeout();
    stopVibration();

    try {
      const stream = await getLocalStream(callState.type);
      const pc = createPeerConnection();

      stream.getTracks().forEach((track: any) => {
        if (pc && localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (!callRecordIdRef.current) {
        await saveCallRecord(
          callState.callId,
          callState.initiator.chatId,
          callState.type,
          callState.initiator.userId,
          user.id,
        );
      }

      const now = Date.now();
      setCallState((prev) => ({
        ...prev,
        status: "active",
        startedAt: now,
      }));

      sendSignal({
        type: "answer",
        callId: callState.callId,
        callType: callState.type,
        senderId: user.id,
        senderName: user.name || user.email || "You",
        recipientId: callState.initiator.userId,
        chatId: callState.initiator.chatId,
        payload: {
          sdp: pc.localDescription,
        },
        timestamp: now,
      });
    } catch (error) {
      console.error("Failed to accept call:", error);
      resetCall();
    }
  }, [
    user,
    callState,
    clearCallTimeout,
    stopVibration,
    sendSignal,
    saveCallRecord,
    getLocalStream,
    createPeerConnection,
    resetCall,
  ]);

  // ── Initiate outgoing call ─────────────────────────────────────────
  const initiateCall = useCallback(
    async (recipient: CallParticipant, type: CallType) => {
      if (!user || isInCall) return;

      const callId = generateCallId();
      const initiator: CallParticipant = {
        userId: user.id,
        displayName: user.name || user.email || "You",
        avatarUrl: user.avatar || null,
        chatId: recipient.chatId,
      };

      isInitiatorRef.current = true;

      setCallState({
        callId,
        type,
        status: "outgoing_ringing",
        initiator,
        recipient,
        isMuted: false,
        isVideoOff: type === "audio",
        isSpeakerOn: true,
      });

      try {
        const stream = await getLocalStream(type);
        const pc = createPeerConnection();

        stream.getTracks().forEach((track: any) => {
          if (pc && localStreamRef.current) {
            pc.addTrack(track, localStreamRef.current);
          }
        });

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
        await pc.setLocalDescription(offer);

        await saveCallRecord(
          callId,
          recipient.chatId,
          type,
          user.id,
          recipient.userId,
        );

        await insertCallMessage(
          recipient.chatId,
          user.id,
          "🔒 End-to-end encrypted call started",
        );

        sendSignal({
          type: "offer",
          callId,
          callType: type,
          senderId: user.id,
          senderName: initiator.displayName,
          senderAvatar: initiator.avatarUrl,
          recipientId: recipient.userId,
          chatId: recipient.chatId,
          payload: {
            sdp: pc.localDescription,
          },
          timestamp: Date.now(),
        });

        timeoutRef.current = setTimeout(() => {
          updateCallRecord(callId, "missed");
          insertCallMessage(recipient.chatId, user.id, "📞 Missed call");
          resetCall();
        }, CALL_TIMEOUT_MS);
      } catch (error) {
        console.error("Failed to initiate call:", error);
        resetCall();
      }
    },
    [
      user,
      isInCall,
      sendSignal,
      resetCall,
      saveCallRecord,
      insertCallMessage,
      updateCallRecord,
      getLocalStream,
      createPeerConnection,
    ],
  );

  // ── Toggle controls ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({
          ...prev,
          isVideoOff: !videoTrack.enabled,
        }));
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setCallState((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  // ── Handle incoming signals ────────────────────────────────────────
  const handleSignal = useCallback(
    async (signal: CallSignal) => {
      switch (signal.type) {
        case "offer": {
          if (isInCall) {
            sendSignal({
              type: "busy",
              callId: signal.callId,
              callType: signal.callType,
              senderId: user?.id || "",
              senderName: user?.name || user?.email || "You",
              recipientId: signal.senderId,
              chatId: signal.chatId,
              timestamp: Date.now(),
            });
            return;
          }

          const initiator: CallParticipant = {
            userId: signal.senderId,
            displayName: signal.senderName,
            avatarUrl: signal.senderAvatar || null,
            chatId: signal.chatId,
          };
          const recipient: CallParticipant = {
            userId: user?.id || "",
            displayName: user?.name || user?.email || "You",
            avatarUrl: user?.avatar || null,
            chatId: signal.chatId,
          };

          isInitiatorRef.current = false;

          setCallState({
            callId: signal.callId,
            type: signal.callType,
            status: "incoming_ringing",
            initiator,
            recipient,
            isMuted: false,
            isVideoOff: signal.callType === "audio",
            isSpeakerOn: true,
          });

          if (signal.payload?.sdp) {
            try {
              const pc = createPeerConnection();
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload.sdp),
              );

              while (pendingCandidatesRef.current.length > 0) {
                const candidate = pendingCandidatesRef.current.shift();
                if (candidate && pc) {
                  await pc.addIceCandidate(candidate);
                }
              }
            } catch (error) {
              console.error("Failed to process offer:", error);
            }
          }

          startIncomingVibration();

          timeoutRef.current = setTimeout(() => {
            declineCall();
          }, CALL_TIMEOUT_MS);
          break;
        }

        case "answer": {
          clearCallTimeout();
          stopVibration();

          if (signal.payload?.sdp && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(signal.payload.sdp),
              );

              while (pendingCandidatesRef.current.length > 0) {
                const candidate = pendingCandidatesRef.current.shift();
                if (candidate && peerConnectionRef.current) {
                  await peerConnectionRef.current.addIceCandidate(candidate);
                }
              }
            } catch (error) {
              console.error("Failed to set remote description:", error);
            }
          }

          setCallState((prev) => ({
            ...prev,
            status: "active",
            startedAt: Date.now(),
          }));
          break;
        }

        case "ice-candidate": {
          if (signal.payload?.candidate && peerConnectionRef.current) {
            try {
              const candidate = new RTCIceCandidate({
                candidate: signal.payload.candidate,
                sdpMid: signal.payload.sdpMid,
                sdpMLineIndex: signal.payload.sdpMLineIndex,
              });

              if (peerConnectionRef.current.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(candidate);
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            } catch (error) {
              console.error("Failed to add ICE candidate:", error);
            }
          }
          break;
        }

        case "busy":
        case "timeout":
        case "hangup": {
          if (signal.callId === callState.callId) {
            clearCallTimeout();
            stopVibration();
            setCallState((prev) => ({ ...prev, status: "ending" }));
            setTimeout(() => {
              resetCall();
            }, 400);
          }
          break;
        }

        default:
          break;
      }
    },
    [
      isInCall,
      callState.callId,
      user,
      sendSignal,
      clearCallTimeout,
      stopVibration,
      startIncomingVibration,
      declineCall,
      resetCall,
      createPeerConnection,
    ],
  );

  // ── Listen for incoming signals ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`call-signal-${user.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "call_signal" }, (payload) => {
        const signal = payload.payload as CallSignal;
        handleSignal(signal);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Call signal channel subscribed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      clearCallTimeout();
      stopVibration();
    };
  }, [user?.id, handleSignal, clearCallTimeout, stopVibration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCallTimeout();
      stopVibration();
      cleanupWebRTC();
    };
  }, [clearCallTimeout, stopVibration, cleanupWebRTC]);

  const value: CallContextType = {
    callState,
    isInCall,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
