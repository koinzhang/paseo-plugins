import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { collapseHomePath } from "../shared/home-path.ts";
import { createKeyedTtlCache } from "./ttl-cache.ts";

export { collapseHomePath };

/** Expand a leading `~` / `~/…` to an absolute path under `homeDir`. */
export function expandHomePath(path: string, homeDir: string): string {
  const trimmed = path.trim();
  if (trimmed === "~") return homeDir;
  if (trimmed.startsWith("~/")) return join(homeDir, trimmed.slice(2));
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
