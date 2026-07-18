import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { FeatureCard } from "../components/FeatureCard";
import { FlowDiagram } from "../components/FlowDiagram";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const DidExplain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelIn = spring({ frame, fps, config: { damping: 200 } });
  const cardDelay = 70;

  return (
    <AbsoluteFill>
      <NodeNetworkBackground opacity={0.5} />
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
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 14}px)`,
            color: COLORS.blue,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 30,
          }}
        >
          STEP 1 — DECENTRALIZED IDENTIFIERS
        </div>
        <FlowDiagram
          startFrame={10}
          staggerFrames={22}
          nodeSize={78}
          nodes={[
            { icon: "🤖", label: "Autonomous agent", color: COLORS.blue },
            { icon: "🪪", label: "Generates a DID", color: COLORS.blue },
            { icon: "🌐", label: "Resolvable anywhere", color: COLORS.gold },
          ]}
        />
        <div style={{ marginTop: 30 }}>
          <FeatureCard
            icon="🔑"
            title="Every agent gets a DID"
            lines={[
              "W3C DID:WEB standard",
              "No centralized registry needed",
              "Resolvable, portable, agent-owned",
            ]}
            accent={COLORS.blue}
            delay={cardDelay}
            lineStagger={8}
          />
        </div>
      </AbsoluteFill>
      <Caption text="A DID is a self-owned, cryptographic identity — no registry to trust." />
    </AbsoluteFill>
  );
};
