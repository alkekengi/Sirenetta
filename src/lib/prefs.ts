import type { SortDirection, SortKey } from "@/lib/diagrams";
import { readItem, writeItem } from "@/lib/storage";

export type SortPrefs = {
  key: SortKey;
  direction: SortDirection;
};

const SIDEBAR_KEY = "sirenetta.prefs.sidebar";
const SORT_KEY = "sirenetta.prefs.sort";

const DEFAULT_SORT: SortPrefs = { key: "savedAt", direction: "desc" };
const SORT_KEYS = new Set<SortKey>(["name", "savedAt", "createdAt"]);

export function readSidebarOpen(fallback: boolean): boolean {
  const raw = readItem(SIDEBAR_KEY);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export function writeSidebarOpen(open: boolean): void {
  writeItem(SIDEBAR_KEY, String(open));
}

export function readSortPrefs(): SortPrefs {
  const raw = readItem(SORT_KEY);
  if (!raw) return { ...DEFAULT_SORT };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const key = SORT_KEYS.has(parsed.key as SortKey)
      ? (parsed.key as SortKey)
      : DEFAULT_SORT.key;
    const direction =
      parsed.direction === "asc" || parsed.direction === "desc"
        ? parsed.direction
        : DEFAULT_SORT.direction;
    return { key, direction };
  } catch {
    return { ...DEFAULT_SORT };
  }
}

export function writeSortPrefs(prefs: SortPrefs): void {
  writeItem(SORT_KEY, JSON.stringify(prefs));
}
