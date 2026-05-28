// screens/CallScreen.tsx
import { CallStatus, useCall } from "@/context/CallContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

let RTCView: any = View;
if (Platform.OS !== "web") {
  RTCView = require("react-native-webrtc").RTCView;
}

const { width, height } = Dimensions.get("window");

// ─── Animated Pulse Ring (native driver disabled on web) ───────────
function PulseRing({ status }: { status: CallStatus }) {
  const ring1 = useRef(new Animated.Value(0.6)).current;
  const ring2 = useRef(new Animated.Value(0.4)).current;
  const ring3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    if (status === "outgoing_ringing" || status === "incoming_ringing") {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.2,
              duration: 1800,
              easing: Easing.out(Easing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: Platform.OS !== "web",
            }),
          ]),
        );

      const a1 = createPulse(ring1, 0);
      const a2 = createPulse(ring2, 600);
      const a3 = createPulse(ring3, 1200);

      a1.start();
      a2.start();
      a3.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
      };
    } else {
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
    }
  }, [ring1, ring2, ring3, status]);

  if (status !== "outgoing_ringing" && status !== "incoming_ringing")
    return null;

  return (
    <View style={styles.pulseContainer}>
      {[ring1, ring2, ring3].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.pulseRing,
            {
              opacity: anim.interpolate({
                inputRange: [0, 0.5, 1.2],
                outputRange: [0.6, 0.3, 0],
              }),
              transform: [{ scale: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Particle Background ─────────────────────────────────────────────
function ParticleBackground() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      opacity: new Animated.Value(Math.random() * 0.3 + 0.1),
      duration: Math.random() * 4000 + 3000,
    })),
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: Math.random() * 0.4 + 0.15,
            duration: p.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(p.opacity, {
            toValue: Math.random() * 0.15 + 0.05,
            duration: p.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ).start();
    });
  }, [particles]);

  return (
    <View style={styles.particleContainer}>
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Video Stream Component ──────────────────────────────────────────
function VideoStreams() {
  const { localStream, remoteStream, callState } = useCall();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (callState.status === "active" && remoteStream) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [callState.status, remoteStream, fadeAnim]);

  if (callState.type !== "video" || callState.status !== "active") {
    return null;
  }

  return (
    <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
      {/* Remote video - full screen */}
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      )}

      {/* Local video - picture-in-picture */}
      {localStream && !callState.isVideoOff && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Video off overlay for local */}
      {callState.isVideoOff && localStream && (
        <View style={styles.localVideoContainer}>
          <View style={styles.videoOffOverlay}>
            <Ionicons
              name="videocam-off"
              size={24}
              color="rgba(255,255,255,0.7)"
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Avatar Circle ───────────────────────────────────────────────────
function CallAvatar({
  displayName,
  isRinging,
  isActive,
  showVideo,
}: {
  displayName: string;
  isRinging: boolean;
  isActive: boolean;
  showVideo?: boolean;
}) {
  const initial = (displayName || "?").charAt(0).toUpperCase();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRinging) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isRinging, scaleAnim]);

  if (showVideo) return null;

  return (
    <Animated.View
      style={[
        styles.avatarOuter,
        { transform: [{ scale: scaleAnim }] },
        isActive && styles.avatarOuterActive,
      ]}
    >
      <LinearGradient
        colors={["#6C5CE7", "#A29BFE", "#FD79A8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarGradient}
      >
        <View style={styles.avatarInner}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Accept / Decline Buttons ────────────────────────────────────────
function AcceptDeclineRow({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  const slideUp = useRef(new Animated.Value(50)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  return (
    <Animated.View
      style={[
        styles.acceptDeclineRow,
        { opacity: fadeIn, transform: [{ translateY: slideUp }] },
      ]}
    >
      <TouchableOpacity
        onPress={onDecline}
        activeOpacity={0.8}
        style={[styles.acceptDeclineBtn, styles.declineBtn]}
      >
        <LinearGradient
          colors={["#FF4757", "#FF6B81"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.acceptDeclineGradient}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.acceptDeclineLabel}>Decline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAccept}
        activeOpacity={0.8}
        style={[styles.acceptDeclineBtn, styles.acceptBtn]}
      >
        <LinearGradient
          colors={["#2ED573", "#7BED9F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.acceptDeclineGradient}
        >
          <Ionicons name="checkmark" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.acceptDeclineLabel}>Accept</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Active Call Controls ────────────────────────────────────────────
function ActiveControls({
  isMuted,
  isVideoOff,
  isSpeakerOn,
  isVideoCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
}: {
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isVideoCall: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}) {
  const slideUp = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  const ControlButton = ({
    icon,
    onPress,
    active = false,
    danger = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    active?: boolean;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.controlButton,
        {
          backgroundColor: danger
            ? "#FF4757"
            : active
              ? "rgba(255,255,255,0.25)"
              : "rgba(255,255,255,0.1)",
          borderWidth: danger ? 0 : 1,
          borderColor: active
            ? "rgba(255,255,255,0.5)"
            : "rgba(255,255,255,0.2)",
        },
        danger && styles.controlButtonDanger,
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger ? "#fff" : active ? "#fff" : "rgba(255,255,255,0.8)"}
      />
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.activeControlsContainer,
        { opacity: fadeIn, transform: [{ translateY: slideUp }] },
      ]}
    >
      <View style={styles.activeControlsRow}>
        <ControlButton
          icon={isMuted ? "mic-off" : "mic"}
          onPress={onToggleMute}
          active={!isMuted}
        />
        {isVideoCall && (
          <ControlButton
            icon={isVideoOff ? "videocam-off" : "videocam"}
            onPress={onToggleVideo}
            active={!isVideoOff}
          />
        )}
        <ControlButton
          icon={isSpeakerOn ? "volume-high" : "volume-mute"}
          onPress={onToggleSpeaker}
          active={isSpeakerOn}
        />
      </View>
      <TouchableOpacity
        onPress={onEndCall}
        activeOpacity={0.8}
        style={styles.endCallButton}
      >
        <LinearGradient
          colors={["#FF4757", "#FF2040"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.endCallGradient}
        >
          <Ionicons
            name="call"
            size={28}
            color="#fff"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Timer Display ───────────────────────────────────────────────────
function CallTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = React.useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return <Text style={styles.timerText}>{display}</Text>;
}

// ─── Main CallScreen ─────────────────────────────────────────────────
export function CallScreen() {
  const {
    callState,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useCall();

  const {
    status,
    type,
    initiator,
    recipient,
    startedAt,
    isMuted,
    isVideoOff,
    isSpeakerOn,
  } = callState;

  if (status === "idle") return null;

  const isRinging =
    status === "outgoing_ringing" || status === "incoming_ringing";
  const isActive = status === "active";
  const isEnding = status === "ending";
  const isIncoming = status === "incoming_ringing";
  const isOutgoing = status === "outgoing_ringing";
  const isVideoCall = type === "video";
  const showVideo = isVideoCall && isActive;

  const displayParticipant = isIncoming ? initiator : recipient;
  const statusText = isOutgoing
    ? "Calling..."
    : isIncoming
      ? `${initiator.displayName} is calling you`
      : isActive
        ? "Connected"
        : "Call ended";

  const callTypeLabel = isVideoCall ? "Video call" : "Audio call";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={
          isEnding
            ? ["#1a1a2e", "#0f0f1a"]
            : isActive
              ? ["#0c0c1d", "#1a1a35", "#0d0d25"]
              : ["#0f0f23", "#1a1030", "#0f0f23"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Video streams layer */}
      {showVideo && <VideoStreams />}

      <ParticleBackground />
      <PulseRing status={status} />

      {/* BlurView for ringing/audio calls */}
      {!showVideo && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      )}

      <View style={[styles.content, showVideo && styles.contentOverVideo]}>
        {!showVideo && (
          <Animated.Text
            style={[styles.callTypeLabel, isEnding && { opacity: 0.5 }]}
          >
            {callTypeLabel}
          </Animated.Text>
        )}

        <CallAvatar
          displayName={displayParticipant.displayName}
          isRinging={isRinging}
          isActive={isActive}
          showVideo={showVideo}
        />

        {!showVideo && (
          <>
            <Text style={[styles.displayName, isEnding && { opacity: 0.6 }]}>
              {displayParticipant.displayName}
            </Text>

            <Text
              style={[
                styles.statusText,
                isActive && styles.statusTextActive,
                isEnding && styles.statusTextEnding,
              ]}
            >
              {isActive && startedAt ? (
                <CallTimer startedAt={startedAt} />
              ) : (
                statusText
              )}
            </Text>

            {/* Encryption badge */}
            <View style={styles.encryptionBadge}>
              <Ionicons
                name="lock-closed"
                size={14}
                color="rgba(46,213,115,0.9)"
              />
              <Text style={styles.encryptionText}>End-to-end encrypted</Text>
            </View>
          </>
        )}

        {/* Call info overlay for video calls */}
        {showVideo && (
          <View style={styles.videoCallInfo}>
            <View style={styles.videoCallInfoBackground}>
              <Text style={styles.videoCallName}>
                {displayParticipant.displayName}
              </Text>
              {isActive && startedAt && <CallTimer startedAt={startedAt} />}
              <View style={styles.encryptionBadge}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color="rgba(46,213,115,0.9)"
                />
                <Text style={styles.encryptionText}>End-to-end encrypted</Text>
              </View>
            </View>
          </View>
        )}

        {isRinging && isIncoming && (
          <AcceptDeclineRow onAccept={acceptCall} onDecline={declineCall} />
        )}

        {isRinging && isOutgoing && (
          <View style={styles.outgoingControls}>
            <Text style={styles.ringingSubtext}>Waiting for answer...</Text>
            <TouchableOpacity
              onPress={endCall}
              activeOpacity={0.8}
              style={styles.cancelButton}
            >
              <LinearGradient
                colors={["#FF4757", "#FF6B81"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cancelButtonGradient}
              >
                <Ionicons name="close" size={24} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isActive && (
          <ActiveControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isSpeakerOn={isSpeakerOn}
            isVideoCall={isVideoCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={endCall}
          />
        )}

        {isEnding && (
          <View style={styles.endingContainer}>
            <Ionicons
              name="call"
              size={40}
              color="rgba(255,255,255,0.3)"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
            <Text style={styles.endingText}>Call ended</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 50,
  },
  contentOverVideo: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    justifyContent: "flex-end",
    paddingBottom: 30,
  },
  // Video styles
  videoContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  remoteVideo: {
    ...StyleSheet.absoluteFill,
  },
  localVideoContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  videoOffOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoCallInfo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
  },
  videoCallInfoBackground: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  videoCallName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  // Original styles
  callTypeLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 32,
  },
  avatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 28,
    shadowColor: "#A29BFE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  avatarOuterActive: {
    shadowColor: "#2ED573",
    shadowOpacity: 0.3,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 57,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
  },
  displayName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  statusText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: "rgba(46,213,115,0.9)",
    fontWeight: "600",
  },
  statusTextEnding: {
    color: "rgba(255,71,87,0.7)",
  },
  timerText: {
    color: "rgba(46,213,115,0.9)",
    fontSize: 18,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  encryptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  encryptionText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
  },
  pulseContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: "rgba(162,155,254,0.6)",
    backgroundColor: "rgba(162,155,254,0.04)",
  },
  particleContainer: {
    ...StyleSheet.absoluteFill,
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  acceptDeclineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
    marginTop: 20,
  },
  acceptDeclineBtn: {
    alignItems: "center",
    gap: 10,
  },
  acceptDeclineGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  declineBtn: {
    shadowColor: "#FF4757",
  },
  acceptBtn: {
    shadowColor: "#2ED573",
  },
  acceptDeclineLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  outgoingControls: {
    alignItems: "center",
    marginTop: 20,
  },
  ringingSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    marginBottom: 24,
  },
  cancelButton: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  activeControlsContainer: {
    alignItems: "center",
    marginTop: 20,
    gap: 24,
  },
  activeControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  controlButtonDanger: {
    shadowColor: "#FF4757",
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  endCallButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  endCallGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  endingContainer: {
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  endingText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontWeight: "500",
  },
});
