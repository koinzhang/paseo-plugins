import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createKeyedTtlCache } from "./ttl-cache.ts";

/** Expand a leading `~` / `~/…` to an absolute path under `homeDir`. */
export function expandHomePath(path: string, homeDir: string): string {
  const trimmed = path.trim();
  if (trimmed === "~") return homeDir;
  if (trimmed.startsWith("~/")) return join(homeDir, trimmed.slice(2));
  return trimmed;
}

/** Collapse `homeDir` prefix to `~` so RPC/UI never expose `/Users/…`. */
export function collapseHomePath(path: string, homeDir: string): string {
  const trimmed = path.trim();
  if (!trimmed || !homeDir) return trimmed;
  if (trimmed === homeDir) return "~";
  const prefix = homeDir.endsWith("/") ? homeDir : `${homeDir}/`;
  if (trimmed.startsWith(prefix)) {
    return `~/${trimmed.slice(prefix.length)}`;
  }
  // Case-insensitive match (macOS default FS); preserve the remainder as-is.
  const lower = trimmed.toLowerCase();
  const homeLower = homeDir.toLowerCase();
  if (lower === homeLower) return "~";
  const prefixLower = homeLower.endsWith("/") ? homeLower : `${homeLower}/`;
  if (lower.startsWith(prefixLower)) {
    return `~/${trimmed.slice(prefixLower.length)}`;
  }
  return trimmed;
}

const rootListingCache = createKeyedTtlCache<string[]>(30_000);

function listRootEntries(root: string): string[] {
  return rootListingCache.get(root, () => {
    try {
      return readdirSync(root);
    } catch {
      return [];
    }
  });
}

/** Find `<name>/SKILL.md` under skill roots (direct or one category level). */
export function resolveSkillMdPath(
  skillName: string,
  roots: readonly string[],
): string | null {
  const name = skillName.trim();
  if (!name) return null;
  for (const root of roots) {
    const direct = join(root, name, "SKILL.md");
    if (existsSync(direct)) return direct;
    for (const entry of listRootEntries(root)) {
      const nested = join(root, entry, name, "SKILL.md");
      if (existsSync(nested)) return nested;
    }
  }
  return null;
}

/** Fill missing skillPath values by scanning local skill roots. */
export function fillMissingSkillPaths<T extends { skillName: string; skillPath: string | null }>(
  items: T[],
  roots: readonly string[],
): T[] {
  return items.map((item) => {
    if (item.skillPath) return item;
    const skillPath = resolveSkillMdPath(item.skillName, roots);
    return skillPath ? { ...item, skillPath } : item;
  });
}

/** Resolve missing paths, then collapse homeDir → `~` on every skillPath. */
export function finalizeSkillPaths<T extends { skillName: string; skillPath: string | null }>(
  items: T[],
  roots: readonly string[],
  homeDir: string,
): T[] {
  return fillMissingSkillPaths(items, roots).map((item) => ({
    ...item,
    skillPath: item.skillPath ? collapseHomePath(item.skillPath, homeDir) : null,
  }));
}
