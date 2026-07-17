import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { COLORS, FONT_STACK } from "../theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill>
      <NodeNetworkBackground />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: FONT_STACK,
          opacity: enter,
        }}
      >
        <div style={{ color: COLORS.ink, fontSize: 50, fontWeight: 800, marginBottom: 18 }}>
          DutchZHC
        </div>
        <div style={{ color: COLORS.gold, fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>
          dutchzerohumancompany.com/services.html
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
