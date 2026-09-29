import type { Item } from "./contracts.ts";

export function itemTitle(item: Item): string {
  if (item.kind === "agent") return item.agentSnapshot?.title || item.title || "Untitled agent";
  if (item.title) return item.title;
  const firstLine = item.body.split("\n").find((line) => line.trim());
  return firstLine?.trim() || (item.kind === "scratch" ? "Empty scratch" : "Untitled note");
}
