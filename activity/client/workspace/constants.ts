import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import type { AgentUsageItem } from "../../shared/usage.ts";

export type WorkspaceTheme = PluginWorkspacePanelProps["theme"];

export type AgentSort = "created" | "updated" | "name" | "messages" | "status";
export type AgentGroup = "none" | "provider" | "status";
export type AgentShowField = "provider" | "calls" | "messages" | "updated" | "prompt";
/** Archive scope: Active / Archived. */
export type AgentStatusFilter = "active" | "archived";
/** Lifecycle for non-archived agents: Idle / Running / Error / Closed. */
export type AgentLifecycleFilter = "idle" | "running" | "error" | "closed";
export type MenuFlyout = "sort" | "group" | "show" | "status" | "lifecycle";

export type AgentStatusInfo = {
  rank: number;
  updatedAt: string | null;
  status: string | null;
  permissionCount: number;
  requiresAttention: boolean;
  attentionReason: string | null;
  /** Host parent session; null for top-level agents. */
  parentAgentId: string | null;
};

/** Icon highlight for attention states; permission keeps the 033 warning badge. */
export type AgentAttentionKind = "finished" | "permission" | "error" | null;

export function attentionKind(info: AgentStatusInfo | undefined): AgentAttentionKind {
  if (!info) return null;
  if (info.status === "error") return "error";
  if (info.permissionCount > 0) return "permission";
  if (!info.requiresAttention) return null;
  if (info.attentionReason === "error") return "error";
  if (info.attentionReason === "finished") return "finished";
  return null;
}

/** Host lifecycle says the agent is actively working a turn (spinner badge). */
export function isAgentRunning(info: AgentStatusInfo | undefined): boolean {
  return info?.status === "running";
}

/** Direct children only (`parentAgentId === agentId`); host status map is the source. */
export function countDirectSubAgents(
  agentId: string,
  byId: Record<string, AgentStatusInfo> | undefined,
): number {
  if (!byId) return 0;
  let count = 0;
  for (const info of Object.values(byId)) {
    if (info.parentAgentId === agentId) count += 1;
  }
  return count;
}

/** parentId → direct child count from usage.agents, scoped by Status filter (041). */
export function countSubAgentsByParent(
  items: ReadonlyArray<{ parentAgentId?: string | null; archivedAt?: string | null }>,
  statusFilters: ReadonlySet<AgentStatusFilter>,
): Record<string, number> {
  const includeActive = statusFilters.has("active");
  const includeArchived = statusFilters.has("archived");
  if (!includeActive && !includeArchived) return {};

  const counts: Record<string, number> = {};
  for (const item of items) {
    const archived = item.archivedAt != null;
    if (archived ? !includeArchived : !includeActive) continue;
    const parentId = item.parentAgentId?.trim();
    if (!parentId) continue;
    counts[parentId] = (counts[parentId] ?? 0) + 1;
  }
  return counts;
}

export type MenuOption = { id: string; label: string; icon: string };

/** Agents header row / search pill height — keep fixed to avoid layout jump. */
export const AGENT_HEADER_HEIGHT = 28;
export const SEARCH_ANIM_MS = 220;
export const SEARCH_TITLE_GAP = 8;
/** Host MenuFlyout overlap between root surface and submenu (`SUBMENU_OVERLAP`). */
export const MENU_SUBMENU_OVERLAP = 5;
export const MENU_WIDTH = 232;
export const MENU_OPTION_ICON_SIZE = 14;
/** Approx list-row height (padding + title/meta) for stable Skills/MCP section size. */
export const RANK_ROW_ESTIMATE = 42;
/** Visible agents per page in Explorer; pager hidden when pageCount ≤ 1. */
export const AGENT_PAGE_SIZE = 40;
export const HOST_AGENT_PAGE_LIMIT = 200;
/** Open terminals poll cadence; the capture preview polls at the same rate while expanded. */
export const TERMINAL_REFETCH_MS = 5_000;
export const TERMINAL_PREVIEW_LINES = 8;

export const SORT_OPTIONS: ReadonlyArray<MenuOption & { id: AgentSort }> = [
  { id: "updated", label: "Updated", icon: "Clock" },
  { id: "created", label: "Created", icon: "CalendarPlus" },
  { id: "name", label: "Name", icon: "Type" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
  { id: "status", label: "Status", icon: "CircleDashed" },
];

export const GROUP_OPTIONS: ReadonlyArray<MenuOption & { id: AgentGroup }> = [
  { id: "none", label: "None", icon: "Minus" },
  { id: "provider", label: "Provider", icon: "Server" },
  { id: "status", label: "Status", icon: "CircleDashed" },
];

export const SHOW_FIELD_OPTIONS: ReadonlyArray<MenuOption & { id: AgentShowField }> = [
  { id: "provider", label: "Provider", icon: "Server" },
  { id: "calls", label: "Calls", icon: "Terminal" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
  { id: "updated", label: "Updated", icon: "Clock" },
  { id: "prompt", label: "Prompt", icon: "Quote" },
];

export const STATUS_FILTER_OPTIONS: ReadonlyArray<MenuOption & { id: AgentStatusFilter }> = [
  { id: "active", label: "Active", icon: "CircleCheck" },
  { id: "archived", label: "Archived", icon: "Archive" },
];

export const LIFECYCLE_FILTER_OPTIONS: ReadonlyArray<
  MenuOption & { id: AgentLifecycleFilter }
> = [
  { id: "idle", label: "Idle", icon: "Circle" },
  { id: "running", label: "Running", icon: "Play" },
  { id: "error", label: "Error", icon: "CircleAlert" },
  { id: "closed", label: "Closed", icon: "CircleOff" },
];

export function optionLabel<T extends string>(
  options: ReadonlyArray<{ id: T; label: string }>,
  id: T,
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

/** 0 = attention-worthy, then running / idle / initializing / closed (unknown). */
export function attentionRank(agent: {
  status?: string;
  requiresAttention?: boolean;
  attentionReason?: string | null;
  pendingPermissions?: ReadonlyArray<unknown>;
}): number {
  if (
    agent.requiresAttention === true ||
    agent.attentionReason === "permission" ||
    agent.attentionReason === "error" ||
    agent.status === "error" ||
    (agent.pendingPermissions?.length ?? 0) > 0
  ) {
    return 0;
  }
  if (agent.status === "running") return 1;
  if (agent.status === "idle") return 2;
  if (agent.status === "initializing") return 3;
  return 4;
}

export function matchesAgentFilters(
  item: AgentUsageItem,
  statusFilters: ReadonlySet<AgentStatusFilter>,
  lifecycleFilters: ReadonlySet<AgentLifecycleFilter>,
  byId: Record<string, AgentStatusInfo> | undefined,
): boolean {
  if (item.archivedAt != null) return statusFilters.has("archived");
  if (!statusFilters.has("active")) return false;
  if (lifecycleFilters.size === 0) return false;
  const status = byId?.[item.agentId]?.status;
  if (status === "idle" || status === "running" || status === "error" || status === "closed") {
    return lifecycleFilters.has(status);
  }
  // initializing / unknown: visible when Active is on and any lifecycle is selected
  return true;
}

export function agentUpdatedAt(
  item: AgentUsageItem,
  byId: Record<string, AgentStatusInfo> | undefined,
): string | null {
  return byId?.[item.agentId]?.updatedAt ?? item.updatedAt ?? item.lastActivityAt ?? null;
}
