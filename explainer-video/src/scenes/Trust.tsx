import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { FlowDiagram } from "../components/FlowDiagram";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

// Recap scene: the whole DID -> VC -> Verifier pipeline animates end-to-end
// first (so the mechanism reads as one continuous flow, not three separate
// facts), then the headline settles underneath once the diagram has landed.
const DIAGRAM_STAGGER = 24;
const HEADLINE_START = 130;

export const Trust: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - HEADLINE_START, fps, config: { damping: 16 } });
  const diagramFade = interpolate(frame, [HEADLINE_START - 10, HEADLINE_START + 20], [1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <NodeNetworkBackground opacity={0.75} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: FONT_STACK,
          padding: "0 140px",
        }}
      >
        <div style={{ opacity: diagramFade, transform: "scale(0.82)", marginBottom: 10 }}>
          <FlowDiagram
            startFrame={0}
            staggerFrames={DIAGRAM_STAGGER}
            nodeSize={84}
            nodes={[
              { icon: "🤖", label: "Agent", color: COLORS.blue },
              { icon: "🪪", label: "DID", color: COLORS.blue },
              { icon: "🔏", label: "Verifiable Credential", color: COLORS.gold },
              { icon: "✅", label: "Verified instantly", color: COLORS.gold },
            ]}
          />
        </div>
        <div
          style={{
            transform: `translateY(${(1 - rise) * 36}px)`,
            opacity: rise,
            color: COLORS.ink,
            fontSize: 50,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.3,
            marginTop: 12,
          }}
        >
          Agent to agent. Org to org.
          <br />
          Trust that's{" "}
          <span style={{ color: COLORS.blue }}>verifiable in milliseconds</span>
          , not weeks.
        </div>
      </AbsoluteFill>
      <Caption text="No human bottleneck. No paperwork. Just cryptographic trust." delay={HEADLINE_START + 10} />
    </AbsoluteFill>
  );
};
