"use client";

type Mode = "light" | "dark";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  hasSvg: boolean;
  exportError: string | null;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

const EXPORT_BUTTON =
  "btn-press rounded-full bg-panel px-4 py-1.5 text-xs font-medium text-[#EDF5F3] disabled:opacity-40";

export default function StudioHeader({
  mode,
  onModeChange,
  hasSvg,
  exportError,
  onDownloadPng,
  onDownloadSvg,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
      style={{
        background: "color-mix(in srgb, var(--canvas) 70%, transparent)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="diagram-sidebar"
          aria-label="Mostra o nascondi i diagrammi"
          className="btn-press rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </button>
        <span className="font-display text-lg font-semibold">sirenetta</span>
      </div>
      <div className="flex items-center gap-2">
        {exportError ? (
          <span className="text-xs font-medium" style={{ color: "#c2452d" }} role="alert">
            {exportError}
          </span>
        ) : null}
        <button onClick={onDownloadPng} disabled={!hasSvg} className={EXPORT_BUTTON}>
          PNG
        </button>
        <button onClick={onDownloadSvg} disabled={!hasSvg} className={EXPORT_BUTTON}>
          SVG
        </button>
        <div className="rounded-full bg-panel p-1 text-[#EDF5F3]">
          <button
            onClick={() => onModeChange("light")}
            className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
              mode === "light" ? "bg-[#EDF5F3] text-[#0E3A3F]" : "opacity-60"
            }`}
          >
            light
          </button>
          <button
            onClick={() => onModeChange("dark")}
            className={`btn-press rounded-full px-3 py-1 text-xs font-medium ${
              mode === "dark" ? "bg-[#EDF5F3] text-[#0E3A3F]" : "opacity-60"
            }`}
          >
            dark
          </button>
        </div>
      </div>
    </header>
  );
}
