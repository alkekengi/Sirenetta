"use client";

import type { DiagramTheme } from "@/lib/render";

type Props = {
  theme: DiagramTheme;
  onChange: (theme: DiagramTheme) => void;
};

type Field = {
  key: keyof DiagramTheme;
  label: string;
  kind: "color" | "text";
};

const FIELDS: Field[] = [
  { key: "background", label: "Sfondo", kind: "color" },
  { key: "primaryColor", label: "Riempimento", kind: "color" },
  { key: "primaryTextColor", label: "Testo", kind: "color" },
  { key: "primaryBorderColor", label: "Stroke", kind: "color" },
  { key: "lineColor", label: "Linee", kind: "color" },
  { key: "arrowheadColor", label: "Frecce", kind: "color" },
  { key: "fontFamily", label: "Font", kind: "text" },
  { key: "fontSize", label: "Dimensione testo", kind: "text" },
];

export default function ThemePanel({ theme, onChange }: Props) {
  function set<K extends keyof DiagramTheme>(key: K, value: string) {
    onChange({ ...theme, [key]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {FIELDS.map((f) => (
        <label key={f.key} className="flex items-center gap-3">
          <input
            type={f.kind === "color" ? "color" : "text"}
            value={theme[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            className={
              f.kind === "color"
                ? "h-8 w-8 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-transparent p-0"
                : "w-full min-w-0 rounded-md border border-line bg-transparent px-2 py-1 font-mono text-xs outline-none focus:border-accent"
            }
            aria-label={f.label}
          />
          <span className="truncate text-xs">{f.label}</span>
        </label>
      ))}
    </div>
  );
}
