import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONT_STACK } from "../theme";

export type FlowNode = {
  icon: string;
  label: string;
  sub?: string;
  color: string;
};

// Animated step-by-step pipeline: nodes pop in one at a time, connected by
// arrows that draw themselves, followed by a traveling "packet" dot — makes
// the abstract DID/VC handshake readable as a simple left-to-right process.
export const FlowDiagram: React.FC<{
  nodes: FlowNode[];
  startFrame?: number;
  staggerFrames?: number;
  nodeSize?: number;
  gap?: number;
}> = ({ nodes, startFrame = 0, staggerFrames = 26, nodeSize = 96, gap = 130 }) => {
  const frame = useCurrentFrame() - startFrame;
  const { fps } = useVideoConfig();
  const nodeWidth = nodeSize + 30;
  const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * gap;

  return (
    <div style={{ position: "relative", width: totalWidth, height: nodeSize + 90 }}>
      <svg
        width={totalWidth}
        height={nodeSize + 90}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {nodes.slice(0, -1).map((_, i) => {
          const x1 = i * (nodeWidth + gap) + nodeWidth;
          const x2 = (i + 1) * (nodeWidth + gap);
          const y = nodeSize / 2;
          const arrowStart = (i + 1) * staggerFrames - 8;
          const lineDraw = interpolate(frame, [arrowStart, arrowStart + 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const dashLength = x2 - x1;
          const travel = interpolate(frame, [arrowStart + 14, arrowStart + 40], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const dotOpacity = interpolate(travel, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);
          const dotX = x1 + (x2 - x1) * travel;
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke={COLORS.blue}
                strokeWidth={3}
                strokeDasharray={dashLength}
                strokeDashoffset={dashLength * (1 - lineDraw)}
              />
              <polygon
                points={`${x2},${y} ${x2 - 12},${y - 7} ${x2 - 12},${y + 7}`}
                fill={COLORS.blue}
                opacity={lineDraw}
              />
              <circle cx={dotX} cy={y} r={6} fill={COLORS.gold} opacity={dotOpacity} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap, position: "relative" }}>
        {nodes.map((n, i) => {
          const delay = i * staggerFrames;
          const enter = spring({
            frame: frame - delay,
            fps,
            config: { damping: 15, mass: 0.6 },
          });
          const settled = Math.max(0, frame - delay - 20);
          const float = Math.sin(settled / 20) * 3 * Math.min(1, settled / 10);
          return (
            <div
              key={i}
              style={{
                width: nodeWidth,
                opacity: enter,
                transform: `translateY(${(1 - enter) * 26 - float}px) scale(${0.85 + enter * 0.15})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                fontFamily: FONT_STACK,
              }}
            >
              <div
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: "50%",
                  background: COLORS.card,
                  border: `3px solid ${n.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: nodeSize * 0.44,
                  boxShadow: `0 0 26px ${n.color}55`,
                }}
              >
                {n.icon}
              </div>
              <div style={{ marginTop: 14, color: COLORS.ink, fontSize: 21, fontWeight: 700 }}>
                {n.label}
              </div>
              {n.sub && (
                <div style={{ marginTop: 4, color: COLORS.inkDim, fontSize: 14 }}>{n.sub}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
