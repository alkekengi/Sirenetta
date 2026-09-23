"use client";

import { useRef, useState } from "react";
import { titleOf, type Diagram } from "@/lib/diagrams";
import { formatAbsolute, formatTimestamp } from "@/lib/time";

type Props = {
  diagram: Diagram;
  active: boolean;
  now: number;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
};

export default function DiagramListItem({
  diagram,
  active,
  now,
  onSelect,
  onRename,
  onRemove,
}: Props) {
  const title = titleOf(diagram);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Escape blurs the input; skip the commit that blur would otherwise run.
  const cancelled = useRef(false);

  function startEditing() {
    setDraft(title);
    setEditing(true);
  }

  function handleBlur() {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    onRename(diagram.id, draft);
  }

  return (
    <li>
      <div
        className={`flex items-start gap-1 rounded-lg px-2 py-2 ${
          active ? "bg-panel text-[#EDF5F3]" : "hover:bg-black/5 dark:hover:bg-white/5"
        }`}
      >
        <div className="min-w-0 flex-1">
          {editing ? (
            <>
              <input
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onBlur={handleBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    cancelled.current = true;
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Nome diagramma"
                className="w-full min-w-0 rounded-md border border-line bg-transparent px-1.5 py-0.5 text-xs outline-none focus:border-accent"
              />
              <span className="mt-1 block text-[10px] opacity-60">
                Invio salva · Esc annulla
              </span>
            </>
          ) : (
            <button
              onClick={() => onSelect(diagram.id)}
              onDoubleClick={startEditing}
              aria-current={active ? "true" : undefined}
              className="block w-full min-w-0 text-left"
            >
              <span className="block truncate text-xs font-medium" title={title}>
                {title}
              </span>
              <span
                className="mt-0.5 block text-[10px] opacity-70"
                title={formatAbsolute(diagram.savedAt)}
              >
                salvato {formatTimestamp(diagram.savedAt, now)}
              </span>
              <span
                className="block text-[10px] opacity-70"
                title={formatAbsolute(diagram.createdAt)}
              >
                creato {formatTimestamp(diagram.createdAt, now)}
              </span>
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={startEditing}
            aria-label={`Rinomina ${title}`}
            title="Rinomina"
            className="btn-press rounded-full p-1 opacity-40 hover:opacity-100"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11.5 2.5l2 2L5 13l-2.5.5L3 11z" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(diagram.id)}
            aria-label={`Elimina ${title}`}
            title="Elimina"
            className="btn-press rounded-full px-1.5 text-sm opacity-40 hover:opacity-100"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}
