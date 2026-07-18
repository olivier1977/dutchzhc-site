import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { COLORS, FONT_STACK } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const eyebrowOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });
  // Gentle continuous drift once settled, so the headline never goes fully static.
  const settleFrame = Math.max(0, frame - 30);
  const float = Math.sin(settleFrame / 24) * 3;
  const underlinePulse = 0.75 + Math.sin(frame / 15) * 0.25;

  return (
    <AbsoluteFill>
      <NodeNetworkBackground />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: FONT_STACK,
        }}
      >
        <div
          style={{
            opacity: eyebrowOpacity,
            color: COLORS.gold,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            marginBottom: 24,
          }}
        >
          INFRASTRUCTURE FOR THE AGENTIC ECONOMY
        </div>
        <div
          style={{
            transform: `scale(${scale}) translateY(${float}px)`,
            color: COLORS.ink,
            fontSize: 88,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          DID &amp; Verifiable Credentials
        </div>
        <div
          style={{
            width: 260,
            height: 4,
            background: COLORS.gold,
            marginTop: 28,
            opacity: underlinePulse,
            transform: `scaleX(${scale})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
