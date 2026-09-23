"use client";

import dynamic from "next/dynamic";

// Fully client-side studio (localStorage draft/theme, CodeMirror, mermaid):
// nothing benefits from SSR, and client-only rendering removes the entire
// hydration-mismatch category (including DOM mutations by password managers).
const StudioClient = dynamic(() => import("@/components/StudioClient"), {
  ssr: false,
  loading: () => <div className="p-5 text-sm opacity-50">Caricamento…</div>,
});

export default function StudioLoader() {
  return <StudioClient />;
}
