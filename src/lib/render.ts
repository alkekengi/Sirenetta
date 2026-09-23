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

function sanitizeCssValue(value: string): string {
  // themeVariables are interpolated into a <style> block in the output SVG,
  // which is mounted via dangerouslySetInnerHTML. Strip markup breakouts
  // (quotes are legit in font stacks like `"Inter", sans-serif`).
  return value.replace(/[<>&]/g, "");
}

// Static, author-controlled CSS (safe under strict mode): soft Apple-like
// geometry — rounded boxes, calmer strokes, semibold edge labels.
const THEME_CSS = `
.node rect, .actor, .note { rx: 9px; ry: 9px; }
.node rect, .actor { stroke-width: 1.5px; }
.edgeLabel { font-weight: 600; }
.messageLine { stroke-width: 1.5px; }
`;

function ensureInit(theme: DiagramTheme) {
  mermaid.initialize({
    startOnLoad: false,
    // "loose" would allow <script>/onclick injection from diagram text
    // combined with dangerouslySetInnerHTML in Preview. Strict keeps
    // labels as plain SVG text (htmlLabels:false also avoids foreignObject,
    // which keeps canvas PNG export untainted).
    securityLevel: "strict",
    theme: "base",
    themeCSS: THEME_CSS,
    flowchart: { htmlLabels: false },
    themeVariables: {
      ...theme,
      fontFamily: sanitizeCssValue(theme.fontFamily),
      fontSize: sanitizeCssValue(theme.fontSize),
      edgeLabelBackground: theme.background,
      clusterBkg: theme.background,
      secondaryColor: theme.background,
      tertiaryColor: theme.primaryBorderColor,
      nodeBorder: theme.primaryBorderColor,
      // Sequence diagrams: same system palette, derived automatically so
      // ThemePanel stays the single source of truth.
      actorBkg: "#FFFFFF",
      actorBorder: theme.primaryBorderColor,
      actorTextColor: theme.primaryTextColor,
      actorLineColor: theme.primaryBorderColor,
      signalColor: theme.lineColor,
      signalTextColor: theme.primaryTextColor,
      labelBoxBkgColor: theme.primaryColor,
      labelBoxBorderColor: theme.primaryBorderColor,
      labelTextColor: theme.primaryTextColor,
      loopTextColor: theme.primaryTextColor,
      noteBkgColor: "#FFFBEB",
      noteBorderColor: "#E7DCC0",
      noteTextColor: theme.primaryTextColor,
      activationBkgColor: "#E8F1FC",
      activationBorderColor: theme.lineColor,
    },
  });
}

function cleanup(id: string) {
  document.getElementById(`d${id}`)?.remove();
  document.getElementById(id)?.remove();
}

// mermaid.initialize mutates global config, so two overlapping render()
// calls with different themes race: the loser renders with the winner's
// theme. Chain renders through a module-level queue to keep init+render
// atomic per call.
let renderQueue: Promise<unknown> = Promise.resolve();

export function renderDiagram(
  code: string,
  theme: DiagramTheme,
): Promise<{ svg: string } | { error: string }> {
  const task = () => renderInner(code, theme);
  const result = renderQueue.then(task, task);
  renderQueue = result.catch(() => {});
  return result;
}

async function renderInner(
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
      e instanceof Error
        ? e.message.split("\n")[0].slice(0, 200)
        : "Sintassi del diagramma non valida";
    return { error: msg };
  } finally {
    cleanup(id);
  }
}
