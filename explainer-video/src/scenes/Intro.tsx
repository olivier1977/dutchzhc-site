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
            transform: `scale(${scale})`,
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
            transform: `scaleX(${scale})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
