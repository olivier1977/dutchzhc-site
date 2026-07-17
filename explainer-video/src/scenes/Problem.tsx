import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill>
      <NodeNetworkBackground opacity={0.6} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_STACK,
          padding: "0 220px",
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - rise) * 40}px)`,
            opacity: rise,
            color: COLORS.ink,
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          How does an autonomous agent prove{" "}
          <span style={{ color: COLORS.gold }}>who it is</span> —
          <br />
          without a human in the loop?
        </div>
      </AbsoluteFill>
      <Caption text="Zero-human companies still need verifiable identity." />
    </AbsoluteFill>
  );
};
