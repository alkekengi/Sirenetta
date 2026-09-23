import mermaid from "mermaid";

export type DiagramTheme = {
  background: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  lineColor: string;
  arrowheadColor: string;
  fontFamily: string;
  fontSize: string;
};

let initialized = false;

function ensureInit(theme: DiagramTheme) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      ...theme,
      fontFamily: theme.fontFamily,
    },
  });
  initialized = true;
}

export async function renderDiagram(
  code: string,
  theme: DiagramTheme,
): Promise<{ svg: string } | { error: string }> {
  try {
    ensureInit(theme);
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { svg } = await mermaid.render(id, code);
    return { svg };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message.split("\n")[0] : "Invalid diagram syntax";
    return { error: msg };
  }
}
