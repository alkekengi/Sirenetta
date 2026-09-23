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

function ensureInit(theme: DiagramTheme) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    flowchart: { htmlLabels: false },
    themeVariables: {
      ...theme,
      edgeLabelBackground: theme.background,
      clusterBkg: theme.background,
      fontFamily: theme.fontFamily,
    },
  });
}

function cleanup(id: string) {
  document.getElementById(`d${id}`)?.remove();
  document.getElementById(id)?.remove();
}

export async function renderDiagram(
  code: string,
  theme: DiagramTheme,
): Promise<{ svg: string } | { error: string }> {
  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    ensureInit(theme);
    const { svg } = await mermaid.render(id, code);
    return { svg };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message.split("\n")[0] : "Invalid diagram syntax";
    return { error: msg };
  } finally {
    cleanup(id);
  }
}
