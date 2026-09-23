"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDiagram,
  createStore,
  NEW_DIAGRAM_CODE,
  readStore,
  TITLE_INPUT_MAX,
  writeStore,
  type Diagram,
  type DiagramStore,
} from "@/lib/diagrams";

export type DiagramsApi = {
  items: Diagram[];
  activeId: string;
  active: Diagram;
  select: (id: string) => void;
  create: () => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  updateCode: (code: string) => void;
};

export function useDiagrams(): DiagramsApi {
  const [store, setStore] = useState<DiagramStore>(readStore);

  // localStorage is an external store: sync the whole store on change.
  useEffect(() => {
    writeStore(store);
  }, [store]);

  const select = useCallback((id: string) => {
    setStore((prev) => (prev.activeId === id ? prev : { ...prev, activeId: id }));
  }, []);

  const create = useCallback(() => {
    const diagram = createDiagram(NEW_DIAGRAM_CODE);
    setStore((prev) => ({ activeId: diagram.id, items: [diagram, ...prev.items] }));
  }, []);

  const remove = useCallback((id: string) => {
    setStore((prev) => {
      const items = prev.items.filter((item) => item.id !== id);
      if (items.length === 0) return createStore(NEW_DIAGRAM_CODE);
      const activeId = prev.activeId === id ? items[0].id : prev.activeId;
      return { activeId, items };
    });
  }, []);

  const rename = useCallback((id: string, title: string) => {
    const next = title.trim().slice(0, TITLE_INPUT_MAX);
    setStore((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, title: next.length > 0 ? next : null } : item,
      ),
    }));
  }, []);

  const updateCode = useCallback((code: string) => {
    const savedAt = Date.now();
    setStore((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === prev.activeId ? { ...item, code, savedAt } : item,
      ),
    }));
  }, []);

  const active = store.items.find((item) => item.id === store.activeId) ?? store.items[0];

  return { items: store.items, activeId: store.activeId, active, select, create, remove, rename, updateCode };
}
