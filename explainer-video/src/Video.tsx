import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Intro } from "./scenes/Intro";
import { Problem } from "./scenes/Problem";
import { DidExplain } from "./scenes/DidExplain";
import { VcExplain } from "./scenes/VcExplain";
import { Trust } from "./scenes/Trust";
import { Outro } from "./scenes/Outro";
import { BrandWatermark } from "./components/BrandWatermark";

export const FPS = 30;

// Scene timing (frames @ 30fps) — mirrors voiceover-script.md timestamps.
const SCENES = [
  { name: "Intro", from: 0, duration: 150, Comp: Intro }, // 0:00-0:05
  { name: "Problem", from: 150, duration: 180, Comp: Problem }, // 0:05-0:11
  { name: "DidExplain", from: 330, duration: 210, Comp: DidExplain }, // 0:11-0:18
  { name: "VcExplain", from: 540, duration: 210, Comp: VcExplain }, // 0:18-0:25
  { name: "Trust", from: 750, duration: 150, Comp: Trust }, // 0:25-0:30
  { name: "Outro", from: 900, duration: 90, Comp: Outro }, // 0:30-0:33
];

export const TOTAL_DURATION_FRAMES = SCENES.reduce(
  (max, s) => Math.max(max, s.from + s.duration),
  0
);

export const DIDExplainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A1E" }}>
      {SCENES.map(({ name, from, duration, Comp }) => (
        <Sequence key={name} name={name} from={from} durationInFrames={duration}>
          <Comp />
        </Sequence>
      ))}
      <BrandWatermark />
    </AbsoluteFill>
  );
};
