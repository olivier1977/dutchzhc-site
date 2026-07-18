import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

// On-screen subtitle synced to the ElevenLabs voiceover script (see voiceover-script.md).
// Renders even without audio so the pilot is watchable muted (LinkedIn/Dev.to default).
export const Caption: React.FC<{ text: string; fadeFrames?: number; delay?: number }> = ({
  text,
  fadeFrames = 12,
  delay = 0,
}) => {
  const frame = useCurrentFrame() - delay;
  const opacity = interpolate(
    frame,
    [0, fadeFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          padding: "16px 36px",
          background: "rgba(10, 14, 28, 0.72)",
          borderRadius: 12,
          border: `1px solid ${COLORS.blue}55`,
          color: COLORS.ink,
          fontFamily: FONT_STACK,
          fontSize: 34,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </div>
  );
};
