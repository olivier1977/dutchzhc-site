import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const Trust: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill>
      <NodeNetworkBackground opacity={0.75} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_STACK,
          padding: "0 200px",
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - rise) * 40}px)`,
            opacity: rise,
            color: COLORS.ink,
            fontSize: 54,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          Agent to agent. Org to org.
          <br />
          Trust that's{" "}
          <span style={{ color: COLORS.blue }}>verifiable in milliseconds</span>
          , not weeks.
        </div>
      </AbsoluteFill>
      <Caption text="No human bottleneck. No paperwork. Just cryptographic trust." />
    </AbsoluteFill>
  );
};
