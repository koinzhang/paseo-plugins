import { parseYaml } from "./yaml-lite.ts";

export type Frontmatter = Record<string, unknown>;

/** Leading `---` YAML block; `{}` when absent or malformed. */
export function parseFrontmatter(content: string): { data: Frontmatter; body: string } {
  const text = content.replace(/^\uFEFF/, "");
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: {}, body: text };
  try {
    return { data: parseYaml(match[1]!), body: text.slice(match[0].length) };
  } catch {
    return { data: {}, body: text.slice(match[0].length) };
  }
}

export function fmString(data: Frontmatter, key: string): string | undefined {
  const value = data[key];
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

/** A string or list field (globs / paths / applyTo) as display text. */
export function fmList(data: Frontmatter, key: string): string | undefined {
  const value = data[key];
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    return items.length ? items.join(", ") : undefined;
  }
  return fmString(data, key);
}

export function fmBool(data: Frontmatter, key: string): boolean | undefined {
  const value = data[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/** First heading or non-empty line, for entries without a description. */
export function firstLine(body: string): string | undefined {
  for (const raw of body.split("\n")) {
    const line = raw.replace(/^#+\s*/, "").trim();
    if (line) return line.length > 160 ? `${line.slice(0, 157)}…` : line;
  }
  return undefined;
}
