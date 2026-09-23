"use client";

import { useEffect, useRef, useState } from "react";
import { renderDiagram, type DiagramTheme } from "@/lib/render";

type Props = {
  code: string;
  theme: DiagramTheme;
  onSvg?: (svg: string | null) => void;
  className?: string;
};

export default function Preview({ code, theme, onSvg, className }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(0);

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
        setError(result.error);
        onSvg?.(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, theme, onSvg]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center p-6 text-sm text-accent ${className ?? ""}`}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center p-6 text-sm opacity-50 ${className ?? ""}`}>
        Rendering…
      </div>
    );
  }

  return (
    <div
      className={`drafting-grid flex items-center justify-center overflow-auto p-6 ${className ?? ""}`}
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}