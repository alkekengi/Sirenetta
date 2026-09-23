"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DiagramSidebar from "@/components/DiagramSidebar";
import Editor from "@/components/Editor";
import Preview from "@/components/Preview";
import StudioHeader from "@/components/StudioHeader";
import { useDebounced } from "@/hooks/useDebounced";
import { useDiagrams } from "@/hooks/useDiagrams";
import type { RenderReport } from "@/hooks/useDiagramRender";
import { usePersistedState } from "@/hooks/usePersistedState";
import { downloadPng, downloadSvg } from "@/lib/export";
import { readSidebarOpen, writeSidebarOpen } from "@/lib/prefs";
import { readTheme, writeTheme } from "@/lib/storage";

const SIDEBAR_ID = "diagram-sidebar";

export default function StudioClient() {
  // Client-only (page uses ssr:false): storage and media reads run on first
  // render, no hydration to mismatch.
  const { items, activeId, active, select, create, remove, rename, updateCode } = useDiagrams();
  // Theme has no UI right now; the stored value still drives render + export.
  const [theme] = usePersistedState(readTheme, writeTheme);
  const debouncedTheme = useDebounced(theme, 250);

  const [sidebarOpen, setSidebarOpen] = usePersistedState(
    () => readSidebarOpen(window.matchMedia("(min-width: 1024px)").matches),
    writeSidebarOpen,
  );
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [exportError, setExportError] = useState<string | null>(null);

  // The SVG is large and changes on every render pass; keep it in a ref keyed
  // by diagram id. `renderedId` is the derived state the buttons need, so
  // switching diagrams disables export until the new one renders.
  const renderRef = useRef<{ id: string; svg: string } | null>(null);
  const [renderedId, setRenderedId] = useState<string | null>(null);
  const hasSvg = renderedId === activeId;

  const handleRender = useCallback(
    (report: RenderReport) => {
      renderRef.current = { id: activeId, svg: report.svg };
      setRenderedId(activeId);
    },
    [activeId],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  function currentSvg(): string | null {
    const rendered = renderRef.current;
    return rendered && rendered.id === activeId ? rendered.svg : null;
  }

  function handleDownloadSvg() {
    const svg = currentSvg();
    if (!svg) return;
    setExportError(null);
    try {
      downloadSvg(svg, "diagram.svg");
    } catch {
      setExportError("Esportazione SVG non riuscita");
    }
  }

  async function handleDownloadPng() {
    const svg = currentSvg();
    if (!svg) return;
    setExportError(null);
    try {
      await downloadPng(svg, "diagram.png", 2, theme.background);
    } catch {
      setExportError("Esportazione PNG non riuscita");
    }
  }

  return (
    // lg:h-dvh + overflow-hidden: constrain the preview pane to the viewport
    // so zoom-fit measures a bounded box. Without it the pane grows with
    // content, fit computes against a giant viewport, and the page scrolls.
    <div className="flex min-h-dvh flex-col bg-canvas text-ink lg:h-dvh lg:overflow-hidden">
      <StudioHeader
        mode={mode}
        onModeChange={setMode}
        hasSvg={hasSvg}
        exportError={exportError}
        onDownloadPng={handleDownloadPng}
        onDownloadSvg={handleDownloadSvg}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex min-h-0 flex-1">
        <DiagramSidebar
          id={SIDEBAR_ID}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          items={items}
          activeId={activeId}
          onSelect={select}
          onCreate={create}
          onRename={rename}
          onRemove={remove}
        />

        <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          {/* Explicit height: CodeMirror height:100% collapses inside an
              auto-height grid row, leaving a 0-height editor on desktop. */}
          <section className="h-[45vh] min-h-0 border-r border-line lg:h-auto">
            <Editor value={active.code} onChange={updateCode} />
          </section>
          {/* key = remount per diagram: clears the old preview and resets zoom. */}
          <Preview
            key={activeId}
            code={active.code}
            theme={debouncedTheme}
            onRender={handleRender}
            className="h-[55vh] lg:h-auto lg:min-h-0"
          />
        </main>
      </div>
    </div>
  );
}
