import React from "react";
import { AbsoluteFill } from "remotion";
import { NodeNetworkBackground } from "../components/NodeNetworkBackground";
import { FeatureCard } from "../components/FeatureCard";
import { Caption } from "../components/Caption";
import { COLORS, FONT_STACK } from "../theme";

export const VcExplain: React.FC = () => {
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
            color: COLORS.gold,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 36,
          }}
        >
          STEP 2 — VERIFIABLE CREDENTIALS
        </div>
        <FeatureCard
          icon="🔏"
          title="Claims become proof"
          lines={[
            "EdDSA-signed attestations",
            "Issued once, verified anywhere",
            "Tamper-evident by design",
          ]}
          accent={COLORS.gold}
        />
      </AbsoluteFill>
      <Caption text="A Verifiable Credential is cryptographic proof of a claim — signed, portable, checkable in milliseconds." />
    </AbsoluteFill>
  );
};
