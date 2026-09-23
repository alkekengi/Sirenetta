"use client";

import { useMemo, useState } from "react";
import DiagramListItem from "@/components/DiagramListItem";
import { useNow } from "@/hooks/useNow";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  filterDiagrams,
  sortDiagrams,
  type Diagram,
  type SortKey,
} from "@/lib/diagrams";
import { readSortPrefs, writeSortPrefs } from "@/lib/prefs";

type Props = {
  id: string;
  open: boolean;
  onClose: () => void;
  items: Diagram[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
};

const CONTROL_CLASS =
  "w-full min-w-0 rounded-md border border-line bg-transparent px-2 py-1 text-xs outline-none focus:border-accent";

export default function DiagramSidebar({
  id,
  open,
  onClose,
  items,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onRemove,
}: Props) {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [sort, setSort] = usePersistedState(readSortPrefs, writeSortPrefs);

  const visible = useMemo(
    () => sortDiagrams(filterDiagrams(items, query), sort.key, sort.direction),
    [items, query, sort],
  );

  const ascending = sort.direction === "asc";

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id={id}
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col overflow-hidden border-r border-line bg-canvas transition-transform duration-300 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:h-full lg:translate-x-0 lg:transition-[width] ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${open ? "lg:w-72" : "lg:w-0"}`}
      >
        <div className="flex h-full w-72 shrink-0 flex-col">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="font-display text-sm font-semibold">Diagrammi</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={onCreate}
                className="btn-press rounded-full border border-line px-3 py-1 text-xs font-medium"
              >
                Nuovo
              </button>
              <button
                onClick={onClose}
                aria-label="Chiudi elenco diagrammi"
                className="btn-press rounded-full px-2 py-1 text-sm opacity-60 hover:opacity-100 lg:hidden"
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-4 pt-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca…"
              aria-label="Cerca diagrammi"
              className={CONTROL_CLASS}
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-3">
            <select
              value={sort.key}
              onChange={(event) => setSort({ ...sort, key: event.target.value as SortKey })}
              aria-label="Ordina per"
              className={`${CONTROL_CLASS} cursor-pointer`}
            >
              <option value="savedAt">Salvato</option>
              <option value="createdAt">Creato</option>
              <option value="name">Nome</option>
            </select>
            <button
              onClick={() =>
                setSort({ ...sort, direction: ascending ? "desc" : "asc" })
              }
              aria-label={ascending ? "Ordinamento crescente" : "Ordinamento decrescente"}
              title={ascending ? "Crescente" : "Decrescente"}
              className="btn-press shrink-0 rounded-md border border-line px-2 py-1 text-xs font-semibold"
            >
              {ascending ? "↑" : "↓"}
            </button>
          </div>

          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {visible.map((diagram) => (
              <DiagramListItem
                key={diagram.id}
                diagram={diagram}
                active={diagram.id === activeId}
                now={now}
                onSelect={onSelect}
                onRename={onRename}
                onRemove={onRemove}
              />
            ))}
          </ul>

          {visible.length === 0 ? (
            <p className="px-4 pb-4 text-xs opacity-60">Nessun risultato</p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
