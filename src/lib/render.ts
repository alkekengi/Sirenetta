import { enrichDiagram } from "@/lib/enrich";

export type DiagramTheme = {
  background: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  lineColor: string;
  arrowheadColor: string;
  fontFamily: string;
  fontSize: string;
  /** "classic" = clean vector, "handDrawn" = sketchy human stroke. */
  look: string;
};

type Mermaid = typeof import("mermaid").default;

// mermaid is heavy; keep it out of the initial chunk and load once on demand.
let mermaidPromise: Promise<Mermaid> | null = null;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((module) => module.default);
  return mermaidPromise;
}

/** Allowlist: look flows into mermaid config, never trust stored values. */
function resolveLook(theme: DiagramTheme): "classic" | "handDrawn" {
  return theme.look === "handDrawn" ? "handDrawn" : "classic";
}

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
/* Human touch: round caps/joins soften every line and arrow tail. */
.messageLine, .actor-line, .loopLine, .edgePath path, .flowchart-link {
  stroke-linecap: round; stroke-linejoin: round;
}
`;

function ensureInit(mermaid: Mermaid, theme: DiagramTheme) {
  const look = resolveLook(theme);
  mermaid.initialize({
    startOnLoad: false,
    // "loose" would allow <script>/onclick injection from diagram text
    // combined with dangerouslySetInnerHTML in Preview. Strict keeps
    // labels as plain SVG text (htmlLabels:false also avoids foreignObject,
    // which keeps canvas PNG export untainted).
    securityLevel: "strict",
    theme: "base",
    look,
    themeCSS: THEME_CSS,
    // Global (not flowchart.htmlLabels, deprecated in v12): SVG <text> labels
    // instead of <foreignObject>, which would taint the canvas and break PNG
    // export.
    htmlLabels: false,
    // basis = smooth organic curves instead of angular elbows.
    flowchart: { curve: "basis", look },
    // Airier sequence layout: wider lanes, taller rows, padded fragments.
    sequence: {
      look,
      actorMargin: 90,
      width: 170,
      height: 70,
      boxMargin: 18,
      boxTextMargin: 8,
      noteMargin: 14,
      messageMargin: 50,
    },
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

// look via initialize() is ignored in v12 (diagram-type defaults win);
// frontmatter is priority 1 and works (verified: rough-node appears).
// Only inject when the user has no frontmatter of their own.
function withLook(code: string, look: "classic" | "handDrawn"): string {
  if (look !== "handDrawn") return code;
  if (/^\s*---\s*\n/.test(code)) return code;
  return `---\nconfig:\n  look: handDrawn\n---\n${code}`;
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
    const mermaid = await loadMermaid();
    ensureInit(mermaid, theme);
    const { svg } = await mermaid.render(id, withLook(code, resolveLook(theme)));
    return { svg: enrichDiagram(svg) };
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
