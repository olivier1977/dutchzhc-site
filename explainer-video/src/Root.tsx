import React from "react";
import { Composition } from "remotion";
import { DIDExplainer, TOTAL_DURATION_FRAMES, FPS } from "./Video";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DIDExplainer"
        component={DIDExplainer}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
