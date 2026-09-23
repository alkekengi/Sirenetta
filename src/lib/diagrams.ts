import { LEGACY_DRAFT_KEY, readItem, writeItem } from "@/lib/storage";
import { SAMPLE } from "@/lib/theme";

export type Diagram = {
  id: string;
  code: string;
  /** User-set name; null means fall back to the derived title. */
  title: string | null;
  createdAt: number;
  /** Last autosave of the code. */
  savedAt: number;
  /** Last successful render, null until the diagram has rendered. */
  renderedAt: number | null;
};

export type DiagramStore = {
  activeId: string;
  items: Diagram[];
};

export type SortKey = "name" | "savedAt" | "renderedAt";
export type SortDirection = "asc" | "desc";

export const STORE_KEY = "sirenetta.diagrams.v1";

export const NEW_DIAGRAM_CODE = `flowchart LR
    A[Inizio] --> B[Fine]`;

const UNTITLED = "Senza titolo";
const TITLE_MAX = 48;
/** Limit for a user-typed name (wider than the derived truncation). */
export const TITLE_INPUT_MAX = 80;

const DIAGRAM_TYPE_RE =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|xychart(?:-beta)?|sankey-beta|block-beta|packet-beta|architecture-beta|C4\w+|radar-beta|requirementDiagram|kanban|info)\b/i;
const LABEL_RE = /[[{(]([^\]})]+)[\]})]/g;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function meaningfulLines(code: string): string[] {
  return code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "---" && !line.startsWith("%%"));
}

/** Bracket labels in a declaration line: `A[Boa] --> B{Ancora}` → [Boa, Ancora]. */
function nodeLabels(line: string): string[] {
  const labels: string[] = [];
  for (const match of line.matchAll(LABEL_RE)) {
    const label = match[1].trim();
    if (label && labels[labels.length - 1] !== label) labels.push(label);
  }
  return labels;
}

function truncate(text: string): string {
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

export function createDiagram(code: string, now = Date.now()): Diagram {
  return { id: newId(), code, title: null, createdAt: now, savedAt: now, renderedAt: null };
}

export function createStore(code = SAMPLE, now = Date.now()): DiagramStore {
  const diagram = createDiagram(code, now);
  return { activeId: diagram.id, items: [diagram] };
}

/**
 * List label. A bare diagram-type line carries no identity, so fall back to
 * the node labels on the next line: "Boa → Ancora".
 */
export function titleFor(code: string): string {
  const [first, second] = meaningfulLines(code);
  if (!first) return UNTITLED;
  if (!second || !DIAGRAM_TYPE_RE.test(first)) return truncate(first);
  const labels = nodeLabels(second);
  if (labels.length >= 2) return truncate(labels.join(" → "));
  return truncate(second);
}

/** Custom name when set, derived title otherwise. */
export function titleOf(diagram: Diagram): string {
  const custom = diagram.title?.trim();
  return custom && custom.length > 0 ? custom : titleFor(diagram.code);
}

export function filterDiagrams(items: Diagram[], query: string): Diagram[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (diagram) =>
      titleOf(diagram).toLowerCase().includes(needle) ||
      diagram.code.toLowerCase().includes(needle),
  );
}

export function sortDiagrams(
  items: Diagram[],
  key: SortKey,
  direction: SortDirection,
): Diagram[] {
  const factor = direction === "asc" ? 1 : -1;
  const titles = new Map(items.map((diagram) => [diagram.id, titleOf(diagram)]));
  return [...items].sort((a, b) => {
    if (key === "name") {
      return factor * (titles.get(a.id) ?? "").localeCompare(titles.get(b.id) ?? "", "it");
    }
    return factor * ((a[key] ?? 0) - (b[key] ?? 0));
  });
}

function toDiagram(value: unknown): Diagram | null {
  if (typeof value !== "object" || value === null) return null;
  const diagram = value as Record<string, unknown>;
  if (
    typeof diagram.id !== "string" ||
    typeof diagram.code !== "string" ||
    typeof diagram.createdAt !== "number" ||
    typeof diagram.savedAt !== "number" ||
    (diagram.renderedAt !== null && typeof diagram.renderedAt !== "number")
  ) {
    return null;
  }
  return {
    id: diagram.id,
    code: diagram.code,
    title: typeof diagram.title === "string" ? diagram.title : null,
    createdAt: diagram.createdAt,
    savedAt: diagram.savedAt,
    renderedAt: diagram.renderedAt ?? null,
  };
}

export function readStore(): DiagramStore {
  const raw = readItem(STORE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const items = Array.isArray(parsed.items)
        ? parsed.items.map(toDiagram).filter((diagram): diagram is Diagram => diagram !== null)
        : [];
      if (items.length > 0) {
        const stored = parsed.activeId;
        const activeId =
          typeof stored === "string" && items.some((item) => item.id === stored)
            ? stored
            : items[0].id;
        return { activeId, items };
      }
    } catch {
      // Corrupt payload: fall through and seed a fresh store.
    }
  }
  // Seed from the legacy single draft so existing work is not lost.
  return createStore(readItem(LEGACY_DRAFT_KEY) ?? SAMPLE);
}

export function writeStore(store: DiagramStore): void {
  writeItem(STORE_KEY, JSON.stringify(store));
}
