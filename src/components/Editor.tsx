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
      theme="light"
      height="100%"
      extensions={[
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%", background: "transparent", color: "var(--ink)" },
          ".cm-gutters": { background: "transparent", border: "none" },
          ".cm-content": { fontFamily: "var(--font-geist-mono), monospace", fontSize: "13px" },
          ".cm-activeLine": { background: "transparent" },
        }),
      ]}
      basicSetup={{ foldGutter: false, autocompletion: false, searchKeymap: false }}
    />
  );
}
