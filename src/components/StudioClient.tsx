"use client";

import { useEffect, useState } from "react";
import Preview from "@/components/Preview";
import ThemePanel from "@/components/ThemePanel";
import { DEFAULT_THEME, SAMPLE } from "@/lib/theme";
import type { DiagramTheme } from "@/lib/render";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function StudioClient() {
  const [code, setCode] = useState(SAMPLE);
  const debouncedCode = useDebounced(code, 250);
  const [theme, setTheme] = useState<DiagramTheme>({ ...DEFAULT_THEME });
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between px-5 py-3">
        <span className="font-display text-lg font-semibold">sirenetta</span>
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
      </header>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="border-r border-line">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent p-5 font-mono text-sm leading-relaxed outline-none"
            placeholder="flowchart TD&#10;  A --> B"
          />
        </section>
        <Preview code={debouncedCode} theme={theme} className="min-h-[50vh] lg:min-h-0" />
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