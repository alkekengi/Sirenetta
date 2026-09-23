"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const PAD = 48;

type Dims = { width: number; height: number };

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export type ZoomPan = {
  containerRef: RefObject<HTMLDivElement | null>;
  scale: number;
  percent: number;
  isFit: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  panning: boolean;
  toggleFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onDoubleClick: () => void;
  };
};

/**
 * Zoom/pan state machine for the diagram viewport. `enabled` mirrors whether
 * the scroll container is mounted (it only exists once a diagram renders).
 */
export function useZoomPan(dims: Dims | null, enabled: boolean): ZoomPan {
  // "fit" = scale diagram to viewport, centered. Any manual zoom keeps the
  // user's choice across re-renders (agency over surprise resets).
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [panning, setPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // The scroll container only mounts once a diagram exists, so re-observe
  // when it appears — otherwise viewport stays 0 and fit collapses to 1.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setViewport({ w: rect.width, h: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  const fitScale = useMemo(() => {
    if (!dims || viewport.w === 0 || viewport.h === 0) return 1;
    return clampZoom(Math.min((viewport.w - PAD) / dims.width, (viewport.h - PAD) / dims.height));
  }, [dims, viewport]);

  const scale = zoom === "fit" ? fitScale : zoom;

  const toggleFit = useCallback(() => {
    setZoom((current) => (current === "fit" ? 1 : "fit"));
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setZoom((current) => clampZoom((current === "fit" ? fitScale : current) * factor));
    },
    [fitScale],
  );

  const zoomIn = useCallback(() => zoomBy(1.25), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.25), [zoomBy]);

  // Ctrl/Cmd + wheel zooms. useEffectEvent keeps the non-passive listener
  // attached once while still reading the live fit scale.
  const handleWheel = useEffectEvent((event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    setZoom((current) => {
      const base = current === "fit" ? fitScale : current;
      return clampZoom(base * Math.exp(-event.deltaY * 0.002));
    });
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const listener = (event: WheelEvent) => handleWheel(event);
    el.addEventListener("wheel", listener, { passive: false });
    return () => el.removeEventListener("wheel", listener);
  }, [enabled]);

  // Mouse drag pans 1:1 (touch uses native scroll; no double handling).
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-zoom-ui]")) return;
    const el = containerRef.current;
    if (!el) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
    setPanning(true);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = containerRef.current;
    if (!drag || !el) return;
    el.scrollLeft = drag.left - (event.clientX - drag.x);
    el.scrollTop = drag.top - (event.clientY - drag.y);
  }, []);

  const endPan = useCallback(() => {
    dragRef.current = null;
    setPanning(false);
  }, []);

  return {
    containerRef,
    scale,
    percent: Math.round(scale * 100),
    isFit: zoom === "fit",
    canZoomIn: scale < MAX_ZOOM - 1e-6,
    canZoomOut: scale > MIN_ZOOM + 1e-6,
    panning,
    toggleFit,
    zoomIn,
    zoomOut,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
      onDoubleClick: toggleFit,
    },
  };
}
