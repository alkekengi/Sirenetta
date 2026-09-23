export const DEFAULT_THEME = {
  background: "#F4F8F7",
  primaryColor: "#7FBFB3",
  primaryTextColor: "#12312F",
  primaryBorderColor: "#0E3A3F",
  lineColor: "#0E3A3F",
  arrowheadColor: "#E8674A",
  fontFamily: "system-ui, sans-serif",
  fontSize: "16px",
} as const;

export const SAMPLE = `flowchart LR
    A[Boa] -->|corda| B{Ancora}
    B --> C[Isola]
    B --> D[Scoglio]`;
