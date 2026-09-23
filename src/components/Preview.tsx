"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderDiagram, type DiagramTheme } from "@/lib/render";
import { resolveSvgSize } from "@/lib/svgSize";

type Props = {
  code: string;
  theme: DiagramTheme;
  onSvg?: (svg: string | null) => void;
  className?: string;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const PAD = 48;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export default function Preview({ code, theme, onSvg, className }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "fit" = scale diagram to viewport, centered. Any manual zoom keeps the
  // user's choice across re-renders (agency over surprise resets).
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const current = ++idRef.current;
    let cancelled = false;

    renderDiagram(code, theme).then((result) => {
      if (cancelled || current !== idRef.current) return;
      if ("svg" in result) {
        setSvg(result.svg);
        setError(null);
        onSvg?.(result.svg);
      } else {
        // Keep last good diagram on screen; transient syntax states while
        // typing must not blank the preview or kill the export buttons.
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, theme, onSvg]);

  const dims = useMemo(() => (svg ? resolveSvgSize(svg) : null), [svg]);
  // The scroll container only mounts once svg exists (early return above),
  // so re-run when it appears — otherwise viewport stays 0 and fit = 1.
  const hasSvg = svg !== null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setViewport({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasSvg]);

  const fitScale = useMemo(() => {
    if (!dims || viewport.w === 0 || viewport.h === 0) return 1;
    return clampZoom(Math.min((viewport.w - PAD) / dims.width, (viewport.h - PAD) / dims.height));
  }, [dims, viewport]);

  const scale = zoom === "fit" ? fitScale : zoom;
  const percent = Math.round(scale * 100);

  // Single toggle: Fit ⇄ actual size. One control, one mental model.
  function toggleFit() {
    setZoom((z) => (z === "fit" ? 1 : "fit"));
  }

  function zoomBy(factor: number) {
    setZoom((z) => clampZoom((z === "fit" ? fitScale : z) * factor));
  }

  // Ctrl/Cmd + wheel zooms (needs non-passive listener for preventDefault).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => {
        const base = z === "fit" ? fitScale : z;
        return clampZoom(base * Math.exp(-e.deltaY * 0.002));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [fitScale, hasSvg]);

  // Mouse drag pans 1:1 (touch uses native scroll; no double handling).
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-zoom-ui]")) return;
    const el = containerRef.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    setPanning(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = containerRef.current;
    if (!drag || !el) return;
    el.scrollLeft = drag.left - (e.clientX - drag.x);
    el.scrollTop = drag.top - (e.clientY - drag.y);
  }

  function endPan() {
    dragRef.current = null;
    setPanning(false);
  }

  if (!svg || !dims) {
    if (error) {
      return (
        <div
          className={`drafting-grid flex items-center justify-center p-6 text-sm ${className ?? ""}`}
          style={{ color: "#c2452d" }}
          role="alert"
        >
          {error}
        </div>
      );
    }
    return (
      <div
        className={`drafting-grid flex items-center justify-center p-6 text-sm ${className ?? ""}`}
        style={{ color: "#5a7a76" }}
      >
        Disegno…
      </div>
    );
  }

  return (
    <div className={`drafting-grid relative min-h-0 ${className ?? ""}`}>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={toggleFit}
        className={`flex h-full w-full overflow-auto ${panning ? "cursor-grabbing" : "cursor-grab"} touch-pan-x touch-pan-y select-none`}
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

      {/* Floating glass zoom pill: translucent material over content (§12),
          instant press feedback (§1), tabular % so width never jitters. */}
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
          onClick={() => zoomBy(1 / 1.25)}
          disabled={scale <= MIN_ZOOM + 1e-6}
          aria-label="Riduci zoom"
          className="btn-press rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-30"
        >
          −
        </button>
        <button
          onClick={toggleFit}
          aria-label={zoom === "fit" ? "Mostra a dimensioni reali" : "Adatta allo schermo"}
          title={zoom === "fit" ? "Dimensioni reali (100%)" : "Adatta allo schermo"}
          className="btn-press min-w-14 rounded-full px-2 py-1 text-xs font-semibold tabular-nums"
        >
          {zoom === "fit" ? "Fit" : `${percent}%`}
        </button>
        <button
          onClick={() => zoomBy(1.25)}
          disabled={scale >= MAX_ZOOM - 1e-6}
          aria-label="Aumenta zoom"
          className="btn-press rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
