import React from "react";
import { COLORS, FONT_STACK } from "../theme";

export const BrandWatermark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 28,
      right: 40,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      fontFamily: FONT_STACK,
    }}
  >
    <div style={{ color: COLORS.blue, fontWeight: 700, fontSize: 22 }}>
      DutchZHC
    </div>
    <div style={{ width: 140, height: 2, background: COLORS.gold, marginTop: 4 }} />
  </div>
);
