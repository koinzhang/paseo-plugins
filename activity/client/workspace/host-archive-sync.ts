import type { AgentUsageItem } from "../../shared/usage.ts";
import type { AgentStatusInfo } from "./constants.ts";

/** Preserve DB metrics while explicit host archive state wins over delayed RPC results. */
export function reconcileHostArchive(
  items: ReadonlyArray<AgentUsageItem>,
  statuses: Record<string, AgentStatusInfo> | undefined,
): AgentUsageItem[] {
  return items.map((item) => {
    const archivedAt = statuses?.[item.agentId]?.archivedAt;
    return archivedAt === undefined || archivedAt === item.archivedAt
      ? item
      : { ...item, archivedAt };
  });
}
