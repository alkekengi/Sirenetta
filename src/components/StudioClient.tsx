"use client";

import { useCallback, useEffect, useState } from "react";
import Preview from "@/components/Preview";
import ThemePanel from "@/components/ThemePanel";
import Editor from "@/components/Editor";
import { DEFAULT_THEME, SAMPLE } from "@/lib/theme";
import { downloadPng, downloadSvg } from "@/lib/export";
import type { DiagramTheme } from "@/lib/render";

const DRAFT_KEY = "sirenetta.draft";
const THEME_KEY = "sirenetta.theme.v2";

function loadDraft(): string {
  if (typeof window === "undefined") return SAMPLE;
  try {
    return localStorage.getItem(DRAFT_KEY) ?? SAMPLE;
  } catch {
    // Private mode / blocked storage must not break first paint.
    return SAMPLE;
  }
}

function loadTheme(): DiagramTheme {
  const base = { ...DEFAULT_THEME };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of Object.keys(base) as (keyof DiagramTheme)[]) {
      const v = parsed[key];
      if (typeof v === "string" && v.length <= 200) base[key] = v;
    }
    return base;
  } catch {
    return base;
  }
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function StudioClient() {
  const [code, setCode] = useState<string | null>(null);
  // DEFAULT init on both server and client: ThemePanel inputs render
  // value={theme} on first paint, so a stored theme in the initializer
  // would diverge from SSR HTML (hydration mismatch). Hydrate post-mount.
  const [theme, setTheme] = useState<DiagramTheme>({ ...DEFAULT_THEME });
  const [ready, setReady] = useState(false);
  // Mounted flag: header buttons must match SSR (disabled) on first paint.
  const [mounted, setMounted] = useState(false);
  const debouncedCode = useDebounced(code ?? "", 250);
  // Theme text inputs fire per keystroke and color pickers fire continuously
  // while dragging; debounce like code to avoid a render storm.
  const debouncedTheme = useDebounced(theme, 250);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage: hydrate after mount to avoid SSR mismatch
    setCode(loadDraft());
    setTheme(loadTheme());
    setReady(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (code !== null) {
      try {
        localStorage.setItem(DRAFT_KEY, code);
      } catch {
        // QuotaExceededError etc: draft persistence is best-effort.
      }
    }
  }, [code]);

  useEffect(() => {
    // Skip the mount run: state still holds defaults, storage holds truth.
    if (!ready) return;
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
    } catch {
      // Best-effort.
    }
  }, [theme, ready]);
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [panelOpen, setPanelOpen] = useState(false);
  const [lastSvg, setLastSvg] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleSvg = useCallback((svg: string | null) => setLastSvg(svg), []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  function handleDownloadSvg() {
    if (!lastSvg) return;
    setExportError(null);
    try {
      downloadSvg(lastSvg, "diagram.svg");
    } catch {
      setExportError("Esportazione SVG non riuscita");
    }
  }

  async function handleDownloadPng() {
    if (!lastSvg) return;
    setExportError(null);
    try {
      await downloadPng(lastSvg, "diagram.png", 2, theme.background);
    } catch {
      setExportError("Esportazione PNG non riuscita");
    }
  }

  return (
    // lg:h-dvh + overflow-hidden: constrain the preview pane to the viewport
    // so zoom-fit measures a bounded box. Without it the pane grows with
    // content, fit computes against a giant viewport, and the page scrolls.
    <div className="flex min-h-dvh flex-col bg-canvas text-ink lg:h-dvh lg:overflow-hidden">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{
          background: "color-mix(in srgb, var(--canvas) 70%, transparent)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <span className="font-display text-lg font-semibold">sirenetta</span>
        <div className="flex items-center gap-2">
          {exportError ? (
            <span className="text-xs font-medium" style={{ color: "#c2452d" }} role="alert">
              {exportError}
            </span>
          ) : null}
          <button
            onClick={handleDownloadPng}
            disabled={!mounted || !lastSvg}
            className="btn-press rounded-full bg-panel px-4 py-1.5 text-xs font-medium text-[#EDF5F3] disabled:opacity-40"
          >
            PNG
          </button>
          <button
            onClick={handleDownloadSvg}
            disabled={!mounted || !lastSvg}
            className="btn-press rounded-full bg-panel px-4 py-1.5 text-xs font-medium text-[#EDF5F3] disabled:opacity-40"
          >
            SVG
          </button>
          <div className="rounded-full bg-panel p-1 text-[#EDF5F3]">
            <button
              onClick={() => setMode("light")}
              className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
                mode === "light" ? "bg-[#EDF5F3] text-[#0E3A3F]" : "opacity-60"
              }`}
            >
              light
            </button>
            <button
              onClick={() => setMode("dark")}
              className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
                mode === "dark" ? "bg-[#EDF5F3] text-[#0E3A3F]" : "opacity-60"
              }`}
            >
              dark
            </button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Explicit height: CodeMirror height:100% collapses inside an
            auto-height grid row, leaving a 0-height editor on desktop. */}
        <section className="h-[45vh] min-h-0 border-r border-line lg:h-auto">
          {code === null ? (
            <div className="p-5 text-sm opacity-50">Caricamento…</div>
          ) : (
            <Editor value={code} onChange={setCode} />
          )}
        </section>
        <Preview
          code={debouncedCode}
          theme={debouncedTheme}
          onSvg={handleSvg}
          className="h-[55vh] lg:h-auto lg:min-h-0"
        />
      </main>

      <footer>
        <button
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          className="btn-press mx-5 my-2 rounded-full border border-line px-4 py-1.5 font-display text-xs font-semibold"
        >
          Tema
        </button>
        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            panelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-line px-5 py-4">
              <ThemePanel theme={theme} onChange={setTheme} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}