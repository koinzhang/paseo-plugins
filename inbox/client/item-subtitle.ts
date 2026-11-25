import type { Item } from "../shared/contracts.ts";

export interface SubtitlePart {
  label: string;
  archived: boolean;
}

export function formatItemTime(value: string, locale?: string): string {
  const date = new Date(value);
  return [
    date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date.toLocaleDateString(locale),
  ].join(" · ");
}

export function workspaceItemSubtitle(item: Item, agentUpdatedAt: string | null | undefined): SubtitlePart[] {
  if (item.kind === "note") return [{ label: formatItemTime(item.updatedAt), archived: false }];
  const provider = item.agentSnapshot?.provider ?? "agent";
  const label = agentUpdatedAt ? `${provider} · ${formatItemTime(agentUpdatedAt)}` : `${provider} · starred ${formatItemTime(item.createdAt)}`;
  return [{ label, archived: false }];
}
