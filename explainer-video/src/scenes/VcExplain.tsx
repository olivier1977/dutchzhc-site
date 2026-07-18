import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { FeatureCard } from "../components/FeatureCard";
import { FlowDiagram } from "../components/FlowDiagram";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const VcExplain: React.FC = () => {
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
            color: COLORS.gold,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 30,
          }}
        >
          STEP 2 — VERIFIABLE CREDENTIALS
        </div>
        <FlowDiagram
          startFrame={10}
          staggerFrames={22}
          nodeSize={78}
          nodes={[
            { icon: "✍️", label: "Issuer signs a claim", color: COLORS.gold },
            { icon: "🔏", label: "Verifiable Credential", color: COLORS.gold },
            { icon: "✅", label: "Verifier checks proof", color: COLORS.blue },
          ]}
        />
        <div style={{ marginTop: 30 }}>
          <FeatureCard
            icon="🔏"
            title="Claims become proof"
            lines={[
              "EdDSA-signed attestations",
              "Issued once, verified anywhere",
              "Tamper-evident by design",
            ]}
            accent={COLORS.gold}
            delay={cardDelay}
            lineStagger={8}
          />
        </div>
      </AbsoluteFill>
      <Caption text="A Verifiable Credential is cryptographic proof of a claim — signed, portable, checkable in milliseconds." />
    </AbsoluteFill>
  );
};
