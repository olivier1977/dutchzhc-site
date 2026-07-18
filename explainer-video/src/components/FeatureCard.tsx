import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

export const FeatureCard: React.FC<{
  icon: string;
  title: string;
  lines: string[];
  accent: string;
  delay?: number;
  lineStagger?: number;
}> = ({ icon, title, lines, accent, delay = 0, lineStagger = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 18 } });

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30}px)`,
        width: 640,
        borderRadius: 20,
        border: `2px solid ${accent}`,
        background: COLORS.card,
        padding: "32px 40px",
        fontFamily: FONT_STACK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 44 }}>{icon}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: COLORS.ink }}>
          {title}
        </div>
      </div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        {lines.map((line, i) => {
          const lineEnter = lineStagger
            ? spring({
                frame: frame - delay - i * lineStagger,
                fps,
                config: { damping: 18 },
              })
            : 1;
          return (
            <div
              key={i}
              style={{
                opacity: lineEnter,
                transform: `translateX(${(1 - lineEnter) * 16}px)`,
                fontSize: 24,
                color: COLORS.inkDim,
                display: "flex",
                gap: 10,
              }}
            >
              <span style={{ color: accent }}>→</span>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};
