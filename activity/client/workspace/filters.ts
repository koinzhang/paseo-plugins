import { matchesAgentTitleSearch } from "../../shared/agent-title-search.ts";
import { formatActivityTime } from "../../shared/format.ts";
import { providerLabel, type AgentUsageItem } from "../../shared/usage.ts";
import {
  type AgentShowField,
  type AgentStatusInfo,
  agentUpdatedAt,
} from "./constants.ts";

export function matchesAgentTitle(item: AgentUsageItem, query: string): boolean {
  return matchesAgentTitleSearch(item.title ?? item.agentId, query);
}

/**
 * Build Agents row meta from Show toggles.
 * `promptPreview` is async (host timeline); pass `…` while loading, or omit when empty/error.
 */
export function formatAgentMeta(
  item: AgentUsageItem,
  showFields: ReadonlySet<AgentShowField>,
  byId: Record<string, AgentStatusInfo> | undefined,
  locale: string,
  promptPreview?: string | null,
): string | null {
  const parts: string[] = [];
  if (showFields.has("provider")) parts.push(providerLabel(item.provider));
  if (showFields.has("calls")) parts.push(`${item.callCount} calls`);
  if (showFields.has("messages")) parts.push(`${item.messageCount} messages`);
  if (showFields.has("updated")) {
    const at = agentUpdatedAt(item, byId);
    if (at) parts.push(formatActivityTime(at, locale));
  }
  if (showFields.has("prompt")) {
    const preview = promptPreview?.trim();
    if (preview) parts.push(preview);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
