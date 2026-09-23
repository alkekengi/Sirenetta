"use client";

import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function Editor({ value, onChange }: Props) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      height="100%"
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
      extensions={[
        EditorView.lineWrapping,
        EditorView.theme({
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
        }),
      ]}
      basicSetup={{ foldGutter: false, autocompletion: false, searchKeymap: false }}
    />
  );
}
