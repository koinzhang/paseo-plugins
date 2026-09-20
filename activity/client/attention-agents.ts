import {
  attentionKind,
  type AgentAttentionKind,
  type AgentStatusInfo,
} from "./workspace/constants.ts";

export type AttentionAgentItem = {
  agentId: string;
  kind: NonNullable<AgentAttentionKind>;
  permissionCount: number;
  updatedAt: string | null;
};

const KIND_ORDER: Record<NonNullable<AgentAttentionKind>, number> = {
  permission: 0,
  error: 1,
  finished: 2,
};

/** Same-workspace interrupt targets: finished / permission / error; never current. */
export function filterAttentionAgents(
  statuses: Record<string, AgentStatusInfo> | undefined,
  currentAgentId: string,
): AttentionAgentItem[] {
  if (!statuses) return [];
  const items: AttentionAgentItem[] = [];
  for (const [agentId, info] of Object.entries(statuses)) {
    if (agentId === currentAgentId) continue;
    const kind = attentionKind(info);
    if (kind == null) continue;
    items.push({
      agentId,
      kind,
      permissionCount: info.permissionCount,
      updatedAt: info.updatedAt,
    });
  }
  return items.sort(compareAttentionAgents);
}

function compareAttentionAgents(a: AttentionAgentItem, b: AttentionAgentItem): number {
  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (byKind !== 0) return byKind;
  const aAt = a.updatedAt ?? "";
  const bAt = b.updatedAt ?? "";
  if (aAt !== bAt) return aAt < bAt ? 1 : -1;
  return a.agentId.localeCompare(b.agentId);
}

/** Pill icon tint: permission > error > finished. */
export function attentionPillTint(
  items: ReadonlyArray<AttentionAgentItem>,
): NonNullable<AgentAttentionKind> | null {
  if (items.length === 0) return null;
  if (items.some((item) => item.kind === "permission")) return "permission";
  if (items.some((item) => item.kind === "error")) return "error";
  return "finished";
}

/** Lucide name: Bell = permission, CircleAlert = error, CircleCheck = finished. */
export function attentionPillIconName(
  tint: NonNullable<AgentAttentionKind> | null,
): "Bell" | "CircleAlert" | "CircleCheck" {
  if (tint === "finished") return "CircleCheck";
  if (tint === "error") return "CircleAlert";
  return "Bell";
}
