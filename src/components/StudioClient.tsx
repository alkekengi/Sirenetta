"use client";

import { useCallback, useEffect, useState } from "react";
import Preview from "@/components/Preview";
import ThemePanel from "@/components/ThemePanel";
import Editor from "@/components/Editor";
import { DEFAULT_THEME, SAMPLE } from "@/lib/theme";
import { downloadPng, downloadSvg } from "@/lib/export";
import type { DiagramTheme } from "@/lib/render";

const DRAFT_KEY = "sirenetta.draft";

function loadDraft(): string {
  if (typeof window === "undefined") return SAMPLE;
  return localStorage.getItem(DRAFT_KEY) ?? SAMPLE;
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
  const debouncedCode = useDebounced(code ?? "", 250);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage draft: hydrate after mount to avoid SSR mismatch
    setCode(loadDraft());
  }, []);

  useEffect(() => {
    if (code !== null) localStorage.setItem(DRAFT_KEY, code);
  }, [code]);
  const [theme, setTheme] = useState<DiagramTheme>({ ...DEFAULT_THEME });
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [panelOpen, setPanelOpen] = useState(false);
  const [lastSvg, setLastSvg] = useState<string | null>(null);

  const handleSvg = useCallback((svg: string | null) => setLastSvg(svg), []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  function handleDownloadSvg() {
    if (lastSvg) downloadSvg(lastSvg, "diagram.svg");
  }

  async function handleDownloadPng() {
    if (lastSvg) await downloadPng(lastSvg, "diagram.png", 2);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
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
          <button
            onClick={handleDownloadPng}
            disabled={!lastSvg}
            className="btn-press rounded-full bg-panel px-4 py-1.5 text-xs font-medium text-canvas disabled:opacity-40"
          >
            PNG
          </button>
          <button
            onClick={handleDownloadSvg}
            disabled={!lastSvg}
            className="btn-press rounded-full bg-panel px-4 py-1.5 text-xs font-medium text-canvas disabled:opacity-40"
          >
            SVG
          </button>
          <div className="rounded-full bg-panel p-1 text-canvas">
            <button
              onClick={() => setMode("light")}
              className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
                mode === "light" ? "bg-canvas text-ink" : "opacity-60"
              }`}
            >
              light
            </button>
            <button
              onClick={() => setMode("dark")}
              className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
                mode === "dark" ? "bg-canvas text-ink" : "opacity-60"
              }`}
            >
              dark
            </button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="min-h-0 border-r border-line">
          {code === null ? (
            <div className="p-5 text-sm opacity-50">Loading…</div>
          ) : (
            <Editor value={code} onChange={setCode} />
          )}
        </section>
        <Preview
          code={debouncedCode}
          theme={theme}
          onSvg={handleSvg}
          className="min-h-[50vh] lg:min-h-0"
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