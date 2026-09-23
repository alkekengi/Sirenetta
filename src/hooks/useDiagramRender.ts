"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { renderDiagram, type DiagramTheme } from "@/lib/render";

export type RenderReport = {
  svg: string;
  renderedAt: number;
};

type RenderState = {
  svg: string | null;
  error: string | null;
};

/** Render `code` with `theme`, keeping the last good SVG on screen. */
export function useDiagramRender(
  code: string,
  theme: DiagramTheme,
  onRender?: (report: RenderReport) => void,
): RenderState {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Effect event: read the latest callback without re-running the render.
  const notifyRender = useEffectEvent((report: RenderReport) => onRender?.(report));

  useEffect(() => {
    const current = ++requestId.current;
    let cancelled = false;

    renderDiagram(code, theme).then((result) => {
      if (cancelled || current !== requestId.current) return;
      if ("svg" in result) {
        setSvg(result.svg);
        setError(null);
        notifyRender({ svg: result.svg, renderedAt: Date.now() });
      } else {
        // Keep the last good diagram on screen; transient syntax states while
        // typing must not blank the preview or kill the export buttons.
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  return { svg, error };
}
