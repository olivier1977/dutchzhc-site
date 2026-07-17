import React from "react";
import { AbsoluteFill } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { FeatureCard } from "../components/FeatureCard";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const DidExplain: React.FC = () => {
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
            color: COLORS.blue,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 36,
          }}
        >
          STEP 1 — DECENTRALIZED IDENTIFIERS
        </div>
        <FeatureCard
          icon="🪪"
          title="Every agent gets a DID"
          lines={[
            "W3C DID:WEB standard",
            "No centralized registry needed",
            "Resolvable, portable, agent-owned",
          ]}
          accent={COLORS.blue}
        />
      </AbsoluteFill>
      <Caption text="A DID is a self-owned, cryptographic identity — no registry to trust." />
    </AbsoluteFill>
  );
};
