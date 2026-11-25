import type { ItemKind } from "../shared/contracts.ts";

export function toggleInboxKind(kinds: ItemKind[], next: ItemKind): ItemKind[] {
  return kinds.includes(next) ? kinds.filter((kind) => kind !== next) : [...kinds, next];
}

export function toggleInboxSelection(selected: string[], next: string): string[] {
  return selected.includes(next) ? selected.filter((value) => value !== next) : [...selected, next];
}
