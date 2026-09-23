import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Dependency-free Mermaid mode: covers flowchart/sequence/class/state/ER/gantt
// keywords, %% comments, "strings", |edge labels|, arrows and brackets.
const KEYWORDS = new Set(
  "flowchart graph sequencediagram classdiagram statediagram statediagram-v2 erdiagram gantt pie journey gitgraph mindmap timeline quadrantchart xychart xychart-beta sankey block block-beta packet packet-beta architecture architecture-beta c4context c4container c4component c4dynamic c4deployment radar radar-beta requirementdiagram info kanban subgraph end direction LR RL TB BT TD title section style classdef class click linkstyle default participant actor autonumber activate deactivate loop alt else opt par and rect critical option note over as state choice fork join dateformat axisformat todaymarker task done active crit milestone".split(
    " ",
  ).map((s) => s.toLowerCase()),
);

const OPERATOR_CHARS = "-=.<>~ox";

const language = StreamLanguage.define({
  name: "mermaid",
  token(stream) {
    if (stream.eatSpace()) return null;
    const ch = stream.peek();
    if (ch === undefined) {
      stream.next();
      return null;
    }
    // %% comment to end of line
    if (stream.match("%%")) {
      stream.skipToEnd();
      return "comment";
    }
    // "quoted string"
    if (ch === '"') {
      stream.next();
      while (!stream.eol()) {
        const c = stream.next();
        if (c === '"') break;
        if (c === "\\") stream.next();
      }
      return "string";
    }
    // |edge label|
    if (ch === "|") {
      stream.next();
      while (!stream.eol() && stream.peek() !== "|") stream.next();
      if (stream.peek() === "|") stream.next();
      return "string";
    }
    // #hex colors
    if (ch === "#") {
      stream.next();
      stream.eatWhile(/[0-9a-zA-Z]/);
      return "number";
    }
    // 123 numbers
    if (/[0-9]/.test(ch)) {
      stream.eatWhile(/[0-9a-zA-Z.%]/);
      return "number";
    }
    // --> --- ==> -.-> ~~~ o--o brackets etc
    if (OPERATOR_CHARS.includes(ch)) {
      stream.eatWhile((c) => OPERATOR_CHARS.includes(c));
      return "operator";
    }
    if ("()[]{}".includes(ch)) {
      stream.next();
      return "bracket";
    }
    // words: keywords vs node ids
    if (stream.match(/[^ \t\-=.<>~|()[\]{}"'%#;:,]+/)) {
      return KEYWORDS.has(stream.current().toLowerCase()) ? "keyword" : "name";
    }
    stream.next();
    return null;
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--cm-keyword)", fontWeight: "600" },
  { tag: tags.comment, color: "var(--cm-comment)", fontStyle: "italic" },
  { tag: tags.string, color: "var(--cm-string)" },
  { tag: tags.number, color: "var(--cm-number)" },
  { tag: tags.operator, color: "var(--cm-operator)" },
  { tag: tags.bracket, color: "var(--cm-operator)" },
  { tag: tags.name, color: "var(--cm-name)" },
]);

export function mermaidSupport(): LanguageSupport {
  return new LanguageSupport(language);
}

export const mermaidHighlight = syntaxHighlighting(highlight);
