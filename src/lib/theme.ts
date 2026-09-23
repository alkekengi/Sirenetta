import type { DiagramTheme } from "@/lib/render";

// Apple-like defaults: system palette, SF stack, generous whitespace feel.
export const DEFAULT_THEME: DiagramTheme = {
  background: "#FFFFFF",
  primaryColor: "#F5F5F7",
  primaryTextColor: "#1D1D1F",
  primaryBorderColor: "#D2D2D7",
  lineColor: "#0071E3",
  arrowheadColor: "#0071E3",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
  fontSize: "14px",
  look: "classic",
};

export const SAMPLE = `flowchart LR
    A[Boa] -->|corda| B{Ancora}
    B --> C[Isola]
    B --> D[Scoglio]`;
