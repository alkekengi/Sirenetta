// Semantic post-processing for mermaid sequence SVGs — the layer mermaid
// itself can't do: code/mono distinction, signal colors, fragment depth,
// self-loop styling, overflow clamping, actor lanes. Runs on the detached
// string so preview + PNG/SVG export share the result. Never throws.

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace';
// Messages/conditions: any bracket or operator glues code.
const CODE_RE = /[(){}]|===|=>|\/\S|\S\//;
// Notes are prose-first: only strong code signals flip them to mono,
// so "(isDirectLending absent → false)" stays readable sans.
const NOTE_CODE_RE = /\(\)|\{\}|===|=>|\w\.\w+\(|\/\S|\S\//;

const DEPTH_STROKE = ["#BFDBFE", "#DDD6FE", "#FDE68A"];
const DEPTH_FILL = ["#0071E3", "#7C3AED", "#D97706"];
const DEPTH_FILL_OPACITY = "0.025";

const LANES = [
  { re: /\bFE\b/i, color: "#0071E3" },
  { re: /\bBFF\b/i, color: "#7C3AED" },
  { re: /\bBPM\b|Camunda/i, color: "#059669" },
] as const;

const SVG_NS = "http://www.w3.org/2000/svg";

type Box = { x1: number; y1: number; x2: number; y2: number };

function num(el: Element, attr: string): number {
  return parseFloat(el.getAttribute(attr) ?? "NaN");
}

function textOf(el: Element): string {
  return el.textContent ?? "";
}

/** Endpoints of a <line> or <path> message shape. */
function endpoints(el: Element): { x1: number; y1: number; x2: number; y2: number } | null {
  if (el.tagName === "line") {
    const x1 = num(el, "x1");
    const x2 = num(el, "x2");
    if (!Number.isFinite(x1) || !Number.isFinite(x2)) return null;
    return { x1, y1: num(el, "y1"), x2, y2: num(el, "y2") };
  }
  const nums = (el.getAttribute("d") ?? "").match(/-?\d+(\.\d+)?/g)?.map(Number);
  if (!nums || nums.length < 4) return null;
  return { x1: nums[0], y1: nums[1], x2: nums[nums.length - 2], y2: nums[nums.length - 1] };
}

function addTitle(el: Element, doc: XMLDocument, text: string) {
  const title = doc.createElementNS(SVG_NS, "title");
  title.textContent = text;
  el.insertBefore(title, el.firstChild);
}

const contains = (outer: Box, inner: Box) =>
  outer.x1 < inner.x1 && outer.x2 > inner.x2 && outer.y1 < inner.y1 && outer.y2 > inner.y2;

const MAX_DEPTH = DEPTH_STROKE.length - 1;

/** How many boxes strictly contain `box`, clamped to the palette size. */
function nestingDepth(box: Box, boxes: Box[]): number {
  return Math.min(
    boxes.filter((outer) => outer !== box && contains(outer, box)).length,
    MAX_DEPTH,
  );
}

export function enrichDiagram(svg: string): string {
  try {
    return enrichInner(svg);
  } catch {
    return svg;
  }
}

function enrichInner(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName === "parsererror") return svg;
  // Sequence only: flowcharts keep themeCSS styling.
  if (!root.querySelector("text.messageText")) return svg;

  // Bounds our restyle grew (note rects): fragment boxes must expand to
  // contain them, or text sticks out past the border.
  const grown: { box: Box; cx: number; cy: number }[] = [];

  // 1. Code tokens → monospace (messages, conditions, section titles).
  const codeTexts = root.querySelectorAll("text.messageText, text.loopText, text.sectionTitle");
  codeTexts.forEach((t) => {
    if (CODE_RE.test(textOf(t))) (t as SVGTextElement).style.fontFamily = MONO;
  });

  // 2. Notes carry meaning: warnings amber, outcomes green/red.
  const notes = root.querySelectorAll("text.noteText");
  notes.forEach((t) => {
    const content = textOf(t);
    const isMono = NOTE_CODE_RE.test(content);
    if (isMono) (t as SVGTextElement).style.fontFamily = MONO;
    const g = t.closest("g");
    const rect = g?.querySelector("rect");
    if (!rect) return;
    {
      // Mermaid sizes the box for its own font metrics; our restyle
      // (mono advances ~0.6em) can overflow it: grow + recenter as needed.
      const size = parseFloat(/font-size:\s*([\d.]+)px/.exec(t.getAttribute("style") ?? "")?.[1] ?? "16");
      const need = content.length * size * (isMono ? 0.6 : 0.52) + 20;
      const have = num(rect, "width");
      const cx = num(t, "x");
      if (Number.isFinite(have) && Number.isFinite(cx) && need > have) {
        const nx = cx - need / 2;
        rect.setAttribute("x", String(nx));
        rect.setAttribute("width", String(Math.round(need)));
        const ry = num(rect, "y");
        const rh = num(rect, "height");
        grown.push({
          box: {
            x1: nx,
            y1: Number.isFinite(ry) ? ry : 0,
            x2: nx + need,
            y2: Number.isFinite(ry) && Number.isFinite(rh) ? ry + rh : 0,
          },
          cx,
          cy: num(t, "y"),
        });
      }
    }
    const s = (rect as SVGRectElement).style;
    if (/stays hidden/i.test(content)) {
      s.fill = "#FEE2E2";
      s.stroke = "#DC2626";
    } else if (/loader mounts/i.test(content)) {
      s.fill = "#DCFCE7";
      s.stroke = "#15803D";
    } else if (/guard|false|never|error|missing|legacy|hidden/i.test(content)) {
      s.fill = "#FEF3C7";
      s.stroke = "#B45309";
    } else {
      return;
    }
    s.strokeWidth = "1.5";
  });

  // 3. Fragment boxes: rebuild from loopLine edges, style by nesting depth.
  const lines = [...root.querySelectorAll('line.loopLine')];
  const hByRange = new Map<string, { x1: number; x2: number; ys: number[]; els: Element[] }>();
  const vLines: { x: number; ya: number; yb: number; el: Element }[] = [];
  lines.forEach((el) => {
    const x1 = num(el, "x1");
    const y1 = num(el, "y1");
    const x2 = num(el, "x2");
    const y2 = num(el, "y2");
    if (Math.abs(y1 - y2) < 2) {
      const key = `${Math.round(Math.min(x1, x2))}-${Math.round(Math.max(x1, x2))}`;
      const g = hByRange.get(key) ?? { x1: Math.min(x1, x2), x2: Math.max(x1, x2), ys: [], els: [] };
      g.ys.push(y1);
      g.els.push(el);
      hByRange.set(key, g);
    } else if (Math.abs(x1 - x2) < 2) {
      vLines.push({ x: x1, ya: Math.min(y1, y2), yb: Math.max(y1, y2), el });
    }
  });
  const boxes: (Box & {
    ox1: number;
    oy1: number;
    top: Element[];
    sides: Element[];
    hAll: Element[];
    vAll: Element[];
  })[] = [];
  hByRange.forEach((g) => {
    if (g.ys.length < 2) return;
    const y1 = Math.min(...g.ys);
    const y2 = Math.max(...g.ys);
    const left = vLines.some((v) => Math.abs(v.x - g.x1) < 2 && v.ya <= y1 + 2 && v.yb >= y2 - 2);
    const right = vLines.some((v) => Math.abs(v.x - g.x2) < 2 && v.ya <= y1 + 2 && v.yb >= y2 - 2);
    if (!left || !right) return;
    const vAll = vLines.filter((v) => Math.abs(v.x - g.x1) < 2 || Math.abs(v.x - g.x2) < 2);
    boxes.push({
      x1: g.x1,
      y1,
      x2: g.x2,
      y2,
      ox1: g.x1,
      oy1: y1,
      top: g.els.filter((el) => Math.abs(num(el, "y1") - y1) < 2 || Math.abs(num(el, "y1") - y2) < 2),
      sides: vAll.map((v) => v.el),
      hAll: g.els,
      vAll: vAll.map((v) => v.el),
    });
  });
  // Expand boxes around grown content (small first so containers cascade).
  const inBox = (b: Box, cx: number, cy: number) =>
    cx >= b.x1 - 3 && cx <= b.x2 + 3 && cy >= b.y1 - 3 && cy <= b.y2 + 3;
  const byArea = [...boxes].sort(
    (a, b) => (a.x2 - a.x1) * (a.y2 - a.y1) - (b.x2 - b.x1) * (b.y2 - b.y1),
  );
  byArea.forEach((b) => {
    let { x1, y1, x2, y2 } = b;
    grown.forEach((n) => {
      if (inBox(b, n.cx, n.cy)) {
        x1 = Math.min(x1, n.box.x1 - 8);
        x2 = Math.max(x2, n.box.x2 + 8);
      }
    });
    boxes.forEach((o) => {
      if (o === b) return;
      const ocx = (o.x1 + o.x2) / 2;
      const ocy = (o.y1 + o.y2) / 2;
      if (inBox(b, ocx, ocy)) {
        x1 = Math.min(x1, o.x1);
        x2 = Math.max(x2, o.x2);
        y1 = Math.min(y1, o.y1);
        y2 = Math.max(y2, o.y2);
      }
    });
    const dx1 = b.x1 - x1; // >0 when expanding left
    const dx2 = x2 - b.x2; // >0 when expanding right
    if (dx1 === 0 && dx2 === 0 && y1 === b.y1 && y2 === b.y2) return;
    b.hAll.forEach((el) => {
      if (Math.abs(num(el, "x1") - b.x1) < 3) el.setAttribute("x1", String(num(el, "x1") - dx1));
      if (Math.abs(num(el, "x2") - b.x2) < 3) el.setAttribute("x2", String(num(el, "x2") + dx2));
    });
    b.vAll.forEach((el) => {
      const x = num(el, "x1");
      if (Math.abs(x - b.x1) < 3) {
        el.setAttribute("x1", String(x - dx1));
        el.setAttribute("x2", String(num(el, "x2") - dx1));
      } else if (Math.abs(x - b.x2) < 3) {
        el.setAttribute("x1", String(x + dx2));
        el.setAttribute("x2", String(num(el, "x2") + dx2));
      }
    });
    b.x1 = x1;
    b.x2 = x2;
    b.y1 = y1;
    b.y2 = y2;
  });
  const main = root.querySelector("g");
  boxes.forEach((b) => {
    const depth = nestingDepth(b, boxes);
    const stroke = DEPTH_STROKE[depth];
    [...b.top, ...b.sides].forEach((el) => {
      const s = (el as SVGLineElement).style;
      s.stroke = stroke;
      s.strokeWidth = "1.5";
    });
    // Depth tint behind content.
    if (main) {
      const tint = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      tint.setAttribute("x", String(b.x1 + 3));
      tint.setAttribute("y", String(b.y1 + 3));
      tint.setAttribute("width", String(Math.max(1, b.x2 - b.x1 - 6)));
      tint.setAttribute("height", String(Math.max(1, b.y2 - b.y1 - 6)));
      tint.setAttribute("rx", "8");
      tint.setAttribute("fill", DEPTH_FILL[depth]);
      tint.setAttribute("fill-opacity", DEPTH_FILL_OPACITY);
      main.insertBefore(tint, main.firstChild);
    }
  });
  // Fragment tabs show the branch condition, not the keyword: the tab that
  // reads "alt" becomes "process type = CONTO (bank account)". The original
  // condition label is hidden (else-branch dividers stay untouched).
  root.querySelectorAll("polygon.labelBox").forEach((poly) => {
    const pts = (poly.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
    if (pts.length < 6 || pts.some((n) => !Number.isFinite(n))) return;
    const xs = pts.filter((_, i) => i % 2 === 0);
    const px = Math.min(...xs);
    const py = Math.min(...pts.filter((_, i) => i % 2 === 1));
    const host = boxes.find((b) => Math.abs(b.ox1 - px) < 3 && Math.abs(b.oy1 - py) < 3);
    const depth = host ? nestingDepth(host, boxes) : 0;
    const parent = poly.parentElement;
    const label = parent?.querySelector("text.labelText");
    // Box expansion may have moved the corner; follow it.
    if (host) {
      const dx = host.x1 - host.ox1;
      if (dx !== 0) {
        const shifted: number[] = [];
        for (let i = 0; i + 1 < pts.length; i += 2) {
          shifted.push(pts[i] + (Math.abs(pts[i] - host.ox1) < 3 ? dx : 0), pts[i + 1]);
        }
        poly.setAttribute("points", shifted.join(" "));
        for (let i = 0; i + 1 < shifted.length; i += 2) pts[i] = shifted[i];
        if (label && Number.isFinite(num(label, "x"))) {
          label.setAttribute("x", String(num(label, "x") + dx));
        }
      }
    }
    // Promote the first branch condition into the tab.
    const loopTexts = parent ? [...parent.querySelectorAll("text.loopText")] : [];
    const cond = loopTexts.find((t) => {
      const y = num(t, "y");
      return y >= py - 5 && y <= py + 34 && num(t, "x") > px;
    });
    if (label && cond) {
      const stripped = textOf(cond).replace(/^\[([\s\S]*)\]$/, "$1").trim();
      if (stripped) {
        const mono = CODE_RE.test(stripped);
        const need = stripped.length * 16 * (mono ? 0.6 : 0.52) + 28;
        const minX = Math.min(...pts.filter((_, i) => i % 2 === 0));
        const maxX = Math.max(...pts.filter((_, i) => i % 2 === 0));
        const delta = need - (maxX - minX);
        if (delta > 0) {
          const widened: number[] = [];
          for (let i = 0; i + 1 < pts.length; i += 2) {
            widened.push(pts[i] + (pts[i] > minX + 1 ? delta : 0), pts[i + 1]);
          }
          poly.setAttribute("points", widened.join(" "));
          for (let i = 0; i + 1 < widened.length; i += 2) pts[i] = widened[i];
        }
        label.textContent = stripped;
        label.setAttribute("x", String(minX + Math.max(need, maxX - minX) / 2));
        const ls = (label as SVGTextElement).style;
        ls.fontWeight = "700";
        if (mono) ls.fontFamily = MONO;
        (cond as SVGTextElement).style.display = "none";
      }
    } else if (label) {
      (label as SVGTextElement).style.fontWeight = "700";
    }
    (poly as SVGPolygonElement).style.stroke = DEPTH_STROKE[depth];
    (poly as SVGPolygonElement).style.strokeWidth = "2";
  });

  // 4. Self-loops read as internal computation: dotted + re-anchored label.
  const messages = [...root.querySelectorAll('[data-et="message"]')];
  const msgTexts = [...root.querySelectorAll("text.messageText")];
  messages.forEach((m) => {
    if (m.getAttribute("data-from") !== m.getAttribute("data-to")) return;
    (m as SVGLineElement).style.strokeDasharray = "1, 5";
    const ep = endpoints(m);
    if (!ep) return;
    const label = msgTexts.find((t) => {
      const x = num(t, "x");
      const y = num(t, "y");
      return Math.abs(x - ep.x1) < 60 && Math.abs(y - ep.y1) < 50;
    });
    if (!label) return;
    label.setAttribute("x", String(ep.x1 + 14));
    label.setAttribute("text-anchor", "start");
    addTitle(label, doc, textOf(label));
  });

  // 5. Overflow: clamp labels wider than their actor gap, keep full text.
  messages.forEach((m) => {
    if (m.getAttribute("data-from") === m.getAttribute("data-to")) return;
    const ep = endpoints(m);
    if (!ep) return;
    const avail = Math.abs(ep.x2 - ep.x1) - 20;
    if (avail < 40) return;
    const label = msgTexts.find((t) => {
      const y = num(t, "y");
      return y >= Math.min(ep.y1, ep.y2) - 24 && y <= Math.max(ep.y1, ep.y2) + 8;
    });
    if (!label) return;
    const content = textOf(label);
    if (content.length * 7.2 > avail) {
      label.setAttribute("textLength", String(Math.round(avail)));
      label.setAttribute("lengthAdjust", "spacingAndGlyphs");
      addTitle(label, doc, content);
    }
  });

  // 6. Actor identity: lane tint only (no icons, no box changes).
  const vb = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  const height = vb?.length === 4 ? vb[3] : 1000;
  const seen = new Set<number>();
  root.querySelectorAll("text.actor-box").forEach((t) => {
    const name = textOf(t);
    const lane = LANES.find((l) => l.re.test(name)) ?? { color: "#6B7280" };
    const g = t.closest("g");
    const box = g?.querySelector("rect");
    // Lane bands anchor to the actor column (box middle).
    const boxCx =
      box && Number.isFinite(num(box, "x")) && Number.isFinite(num(box, "width"))
        ? num(box, "x") + num(box, "width") / 2
        : NaN;
    if (Number.isFinite(boxCx) && !seen.has(Math.round(boxCx)) && main) {
      seen.add(Math.round(boxCx));
      const band = doc.createElementNS(SVG_NS, "rect");
      band.setAttribute("x", String(boxCx - 75));
      band.setAttribute("y", "50");
      band.setAttribute("width", "150");
      band.setAttribute("height", String(Math.max(1, height - 100)));
      band.setAttribute("rx", "14");
      band.setAttribute("fill", lane.color);
      band.setAttribute("fill-opacity", "0.05");
      main.insertBefore(band, main.firstChild);
    }
  });

  return new XMLSerializer().serializeToString(doc);
}
