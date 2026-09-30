/** Tags a new note gets when it is first saved. */
export interface DraftTags {
  /** Tag this workspace and its project. */
  workspaceId?: string;
  /** Tag only this workspace's project. */
  projectOfWorkspace?: string;
}

/** What the Inbox surface should open next; set by commands before `openSurface`. */
export type SelectionRequest = { itemId: string } | { draft: DraftTags };

let pending: SelectionRequest | null = null;
const listeners = new Set<() => void>();

function request(next: SelectionRequest): void {
  pending = next;
  for (const listener of listeners) listener();
}

export function requestSelection(itemId: string): void {
  request({ itemId });
}

/** Opens an unsaved note; nothing is stored until it has a title or body. */
export function requestDraft(draft: DraftTags = {}): void {
  request({ draft });
}

export function takeSelection(): SelectionRequest | null {
  const next = pending;
  pending = null;
  return next;
}

export function onSelectionRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const changeListeners = new Set<() => void>();

/** Commands that write without opening the Inbox call this so mounted lists refetch. */
export function notifyItemsChanged(): void {
  for (const listener of changeListeners) listener();
}

export function onItemsChanged(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}
