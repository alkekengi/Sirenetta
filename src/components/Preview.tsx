"use client";

import { useMemo } from "react";
import { useDebounced } from "@/hooks/useDebounced";
import { useDiagramRender, type RenderReport } from "@/hooks/useDiagramRender";
import { useZoomPan } from "@/hooks/useZoomPan";
import type { DiagramTheme } from "@/lib/render";
import { resolveSvgSize } from "@/lib/svgSize";

type Props = {
  code: string;
  theme: DiagramTheme;
  onRender?: (report: RenderReport) => void;
  className?: string;
};

export default function Preview({ code, theme, onRender, className }: Props) {
  // Debounce lives here (not in the shell) so remounting on diagram switch
  // renders the newly selected diagram immediately.
  const debouncedCode = useDebounced(code, 250);
  const { svg, error } = useDiagramRender(debouncedCode, theme, onRender);
  const dims = useMemo(() => (svg ? resolveSvgSize(svg) : null), [svg]);
  const {
    containerRef,
    handlers,
    panning,
    scale,
    percent,
    isFit,
    canZoomIn,
    canZoomOut,
    toggleFit,
    zoomIn,
    zoomOut,
  } = useZoomPan(dims, svg !== null);

  if (!svg || !dims) {
    return (
      <div
        className={`drafting-grid flex items-center justify-center p-6 text-sm ${className ?? ""}`}
        style={{ color: error ? "#c2452d" : "#5a7a76" }}
        role={error ? "alert" : undefined}
      >
        {error ?? "Disegno…"}
      </div>
    );
  }

  return (
    <div className={`drafting-grid relative min-h-0 ${className ?? ""}`}>
      <div
        ref={containerRef}
        {...handlers}
        className={`flex h-full w-full overflow-auto ${
          panning ? "cursor-grabbing" : "cursor-grab"
        } touch-pan-x touch-pan-y select-none`}
      >
        {/* m-auto = safe centering: stays centered when smaller, scrolls
            correctly when larger (justify-center would clip the top). */}
        <div
          className="m-auto shrink-0 [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          style={{ width: dims.width * scale, height: dims.height * scale }}
        >
          <div dangerouslySetInnerHTML={{ __html: svg }} className="h-full w-full" />
        </div>
      </div>

      {error ? (
        <div
          className="pointer-events-none absolute top-3 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full px-4 py-1 text-xs font-medium"
          style={{ color: "#c2452d", background: "color-mix(in srgb, #c2452d 12%, var(--canvas))" }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {/* Floating glass zoom pill: translucent material over content, instant
          press feedback, tabular % so width never jitters. */}
      <div
        data-zoom-ui
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-black/10 p-1 shadow-lg shadow-black/10 motion-reduce:transition-none dark:border-white/15"
        style={{
          background: "color-mix(in srgb, var(--canvas) 72%, transparent)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
        role="toolbar"
        aria-label="Zoom diagramma"
      >
        <button
          onClick={zoomOut}
          disabled={!canZoomOut}
          aria-label="Riduci zoom"
          className="btn-press rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-30"
        >
          −
        </button>
        <button
          onClick={toggleFit}
          aria-label={isFit ? "Mostra a dimensioni reali" : "Adatta allo schermo"}
          title={isFit ? "Dimensioni reali (100%)" : "Adatta allo schermo"}
          className="btn-press min-w-14 rounded-full px-2 py-1 text-xs font-semibold tabular-nums"
        >
          {isFit ? "Fit" : `${percent}%`}
        </button>
        <button
          onClick={zoomIn}
          disabled={!canZoomIn}
          aria-label="Aumenta zoom"
          className="btn-press rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
