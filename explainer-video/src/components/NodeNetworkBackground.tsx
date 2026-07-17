import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";

type Node = { x: number; y: number; seed: number };

// Deterministic pseudo-random generator so every render is frame-identical.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NodeNetworkBackground: React.FC<{
  nodeCount?: number;
  opacity?: number;
}> = ({ nodeCount = 42, opacity = 1 }) => {
  const frame = useCurrentFrame();

  const nodes: Node[] = useMemo(() => {
    const rand = mulberry32(7);
    return new Array(nodeCount).fill(0).map((_, i) => ({
      x: rand() * 100,
      y: rand() * 100,
      seed: i,
    }));
  }, [nodeCount]);

  const drift = frame * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, opacity }}
      >
        {nodes.map((a, i) =>
          nodes.map((b, j) => {
            if (j <= i) return null;
            const ax = a.x + Math.sin(drift + a.seed) * 1.2;
            const ay = a.y + Math.cos(drift + a.seed) * 1.2;
            const bx = b.x + Math.sin(drift + b.seed) * 1.2;
            const by = b.y + Math.cos(drift + b.seed) * 1.2;
            const dist = Math.hypot(ax - bx, ay - by);
            if (dist > 16) return null;
            const strokeOpacity = interpolate(dist, [0, 16], [0.35, 0]);
            return (
              <line
                key={`${i}-${j}`}
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke={COLORS.blue}
                strokeWidth={0.08}
                strokeOpacity={strokeOpacity}
              />
            );
          })
        )}
        {nodes.map((n, i) => {
          const nx = n.x + Math.sin(drift + n.seed) * 1.2;
          const ny = n.y + Math.cos(drift + n.seed) * 1.2;
          return (
            <circle
              key={i}
              cx={nx}
              cy={ny}
              r={0.35}
              fill={COLORS.blue}
              opacity={0.7}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
