import type { DiagramTheme } from "@/lib/render";
import { DEFAULT_THEME } from "@/lib/theme";

export const THEME_KEY = "sirenetta.theme.v2";
/** Legacy single-draft key. Read once to seed the diagram store. */
export const LEGACY_DRAFT_KEY = "sirenetta.draft";

const MAX_VALUE_LENGTH = 200;
const LOOKS = new Set(["classic", "handDrawn"]);

export function readItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    // Private mode / blocked storage: treat as empty.
    return null;
  }
}

export function writeItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // QuotaExceededError etc: persistence is best-effort.
  }
}

export function readTheme(): DiagramTheme {
  const raw = readItem(THEME_KEY);
  if (!raw) return { ...DEFAULT_THEME };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const theme = { ...DEFAULT_THEME };
    for (const key of Object.keys(theme) as (keyof DiagramTheme)[]) {
      const value = parsed[key];
      if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) continue;
      // look flows into mermaid config: allowlist, never trust storage.
      if (key === "look" && !LOOKS.has(value)) continue;
      theme[key] = value;
    }
    return theme;
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function writeTheme(theme: DiagramTheme): void {
  writeItem(THEME_KEY, JSON.stringify(theme));
}
