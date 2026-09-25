import { realpathSync } from "node:fs";
import path from "node:path";
import type { Entry } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";

const NATIVE_SKILL_ROOTS: Partial<Record<ProviderId, readonly string[]>> = {
  claude: [".claude"], codex: [".agents", ".codex"], cursor: [".cursor"],
  copilot: [".github", ".copilot"], opencode: [".opencode"], pi: [".pi"], omp: [".omp"],
  cline: [".cline"], "codebuddy-code": [".codebuddy"], gemini: [".gemini"],
  goose: [".goose"], grok: [".grok"], kilo: [".kilo"], kiro: [".kiro"],
  kimi: [".kimi-code"], "qwen-code": [".qwen"], traecli: [".traecli", ".trae", ".trae-cn"],
};

function directoryRank(provider: ProviderId, file: string): number {
  const parts = path.resolve(file).split(path.sep);
  const native = NATIVE_SKILL_ROOTS[provider] ?? [];
  const isRoot = (part: string) => part === "skills" || part === "managed-skills" || part === "skills-cursor";
  const skillRoot = parts.findLastIndex((part, index) => isRoot(part)
    && (native.includes(parts[index - 1] ?? "") || native.includes(parts[index - 2] ?? "")
      || parts[index - 1] === ".agents" || provider === "opencode" && parts[index - 1] === "opencode"));
  const owner = skillRoot > 0 ? parts[skillRoot - 1] : "";
  const grandparent = skillRoot > 1 ? parts[skillRoot - 2] : "";
  if (native.includes(owner) || native.includes(grandparent)
    || provider === "opencode" && owner === "opencode") return 0;
  if (owner === ".agents") return 1;
  return 2;
}

const usable = (entry: Entry) => entry.status !== "disabled" && entry.status !== "inactive";

/** Collapse only aliases of the same physical skill file; keep same-name distinct files. */
export function mergeSkillAliases(provider: ProviderId, entries: readonly Entry[]): Entry[] {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (entry.category !== "skills") continue;
    let physical: string;
    try {
      physical = realpathSync(entry.path);
    } catch {
      physical = path.resolve(entry.path);
    }
    const group = groups.get(physical) ?? [];
    group.push(entry);
    groups.set(physical, group);
  }
  const selected = new Map<string, Entry>();
  for (const group of groups.values()) {
    group.sort((a, b) => directoryRank(provider, a.path) - directoryRank(provider, b.path)
      || Number(usable(b)) - Number(usable(a))
      || Number(b.scope === "project") - Number(a.scope === "project")
      || a.path.localeCompare(b.path));
    const display = group[0]!;
    const active = group.find(usable);
    selected.set(display.id, active && !usable(display)
      ? { ...display, status: active.status, reason: active.reason, tags: [...new Set([...display.tags, ...active.tags])] }
      : display);
  }
  return entries.filter((entry) => entry.category !== "skills" || selected.has(entry.id))
    .map((entry) => selected.get(entry.id) ?? entry);
}
