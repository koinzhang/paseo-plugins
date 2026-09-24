/**
 * Minimal YAML reader for frontmatter and small config files: block maps,
 * block lists, inline `[a, b]` lists, quoted scalars, and `|` / `>` block
 * scalars. Anchors, tags, and multi-document streams are not supported.
 */

type Line = { indent: number; text: string };

export function parseYaml(source: string): Record<string, unknown> {
  const lines: Line[] = [];
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) {
      lines.push({ indent: -1, text: "" });
      continue;
    }
    lines.push({ indent: raw.length - raw.trimStart().length, text: raw.trimEnd() });
  }
  const state = { i: 0 };
  const value = parseBlock(lines, state, 0);
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function skipBlank(lines: Line[], state: { i: number }) {
  while (state.i < lines.length && lines[state.i]!.indent < 0) state.i++;
}

function parseBlock(lines: Line[], state: { i: number }, minIndent: number): unknown {
  skipBlank(lines, state);
  const first = lines[state.i];
  if (!first || first.indent < minIndent) return null;
  const indent = first.indent;
  if (first.text.trimStart().startsWith("- ") || first.text.trim() === "-") {
    return parseList(lines, state, indent);
  }
  return parseMap(lines, state, indent);
}

function parseList(lines: Line[], state: { i: number }, indent: number): unknown[] {
  const out: unknown[] = [];
  for (;;) {
    skipBlank(lines, state);
    const line = lines[state.i];
    if (!line || line.indent !== indent) break;
    const body = line.text.trimStart();
    if (!body.startsWith("-")) break;
    const rest = body.slice(1).trimStart();
    state.i++;
    if (!rest) {
      out.push(parseBlock(lines, state, indent + 1));
    } else if (/^[^'"[{][^:]*:(\s|$)/.test(rest)) {
      // `- key: value` starts an inline map; continuation lines are indented past the dash.
      const inner: Line[] = [{ indent: indent + 2, text: " ".repeat(indent + 2) + rest }];
      while (state.i < lines.length && (lines[state.i]!.indent < 0 || lines[state.i]!.indent > indent)) {
        inner.push(lines[state.i]!);
        state.i++;
      }
      out.push(parseMap(inner, { i: 0 }, indent + 2));
    } else {
      out.push(parseScalar(rest));
    }
  }
  return out;
}

function parseMap(lines: Line[], state: { i: number }, indent: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (;;) {
    skipBlank(lines, state);
    const line = lines[state.i];
    if (!line || line.indent !== indent) break;
    const body = line.text.trimStart();
    const match = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:#]+?)\s*:(?:\s+(.*))?$/.exec(body);
    if (!match) {
      state.i++;
      continue;
    }
    const key = unquote(match[1]!.trim());
    const rest = stripComment(match[2] ?? "").trim();
    state.i++;
    if (rest === "|" || rest === ">" || /^[|>][+-]?$/.test(rest)) {
      out[key] = parseBlockScalar(lines, state, indent, rest.startsWith(">"));
    } else if (!rest) {
      out[key] = parseBlock(lines, state, indent + 1);
    } else {
      out[key] = parseScalar(rest);
    }
  }
  return out;
}

function parseBlockScalar(lines: Line[], state: { i: number }, indent: number, folded: boolean): string {
  const parts: string[] = [];
  let blockIndent = -1;
  while (state.i < lines.length) {
    const line = lines[state.i]!;
    if (line.indent >= 0 && line.indent <= indent) break;
    if (line.indent >= 0 && blockIndent < 0) blockIndent = line.indent;
    parts.push(line.indent < 0 ? "" : line.text.slice(Math.max(0, blockIndent)));
    state.i++;
  }
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return folded ? parts.join(" ").replace(/\s+\n/g, "\n") : parts.join("\n");
}

function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(text[i - 1]!))) {
      return text.slice(0, i);
    }
  }
  return text;
}

function unquote(text: string): string {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text) as string;
    } catch {
      return text.slice(1, -1);
    }
  }
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

function splitInlineList(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (const ch of body) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

export function parseScalar(raw: string): unknown {
  const text = stripComment(raw).trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    return splitInlineList(text.slice(1, -1)).map(parseScalar);
  }
  if (text.startsWith('"') || text.startsWith("'")) return unquote(text);
  if (text === "true" || text === "True" || text === "TRUE") return true;
  if (text === "false" || text === "False" || text === "FALSE") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}
