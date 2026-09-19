import { formatUsagePillLabel } from "../shared/usage.ts";
import type { McpByToolItem, SkillByNameItem } from "../shared/usage.ts";

export type UsagePillData = {
  skills: SkillByNameItem[];
  mcpTools: McpByToolItem[];
};

/** Survives separate React trees when icon and popover do not share a QueryClient. */
const pillDataCache = new Map<string, UsagePillData>();

export function pillDataIsEmpty(data: UsagePillData): boolean {
  return formatUsagePillLabel(undefined, data.skills, data.mcpTools).length === 0;
}

export function seedPillDataForQuery(agentId: string): UsagePillData | undefined {
  const cached = pillDataCache.get(agentId);
  if (!cached || pillDataIsEmpty(cached)) return undefined;
  return cached;
}

export function writePillDataCache(agentId: string, data: UsagePillData): void {
  pillDataCache.set(agentId, data);
}

export function clearPillDataCache(agentId: string): void {
  pillDataCache.delete(agentId);
}

/** Test helper: seed / clear the cross-tree pill cache. */
export function __setPillDataCacheForTests(
  agentId: string,
  data: UsagePillData | undefined,
): void {
  if (data === undefined) pillDataCache.delete(agentId);
  else pillDataCache.set(agentId, data);
}
