"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { mermaidHighlight, mermaidSupport } from "@/lib/mermaidMode";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

// Hoisted: creating a new EditorView.theme object per render changes the
// extensions array identity, forcing CodeMirror to reconfigure on every
// keystroke (typing lag / cursor jumps).
const editorTheme = EditorView.theme({
  "&": { height: "100%", background: "transparent", color: "var(--ink)" },
  ".cm-gutters": { background: "transparent", border: "none", color: "var(--line)" },
  ".cm-content": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "13px",
    caretColor: "var(--accent)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    background: "color-mix(in srgb, var(--accent) 25%, transparent)",
  },
  ".cm-activeLine": { background: "transparent" },
});

export default function Editor({ value, onChange }: Props) {
  // Memoized: new extension identity per render forces CodeMirror to
  // reconfigure on every keystroke (typing lag / cursor jumps).
  const extensions = useMemo(
    () => [EditorView.lineWrapping, editorTheme, mermaidSupport(), mermaidHighlight],
    [],
  );
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      height="100%"
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
      extensions={extensions}
      basicSetup={{ foldGutter: false, autocompletion: false, searchKeymap: false }}
    />
  );
}
