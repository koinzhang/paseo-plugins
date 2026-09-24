const ACTION_SELECTOR = '[aria-label], [role], button, a';

export function isChangesRepositoryToolbarEmpty(element: {
  textContent: string | null;
  querySelectorAll(selector: string): ArrayLike<unknown>;
}): boolean {
  return !element.textContent?.trim() && element.querySelectorAll(ACTION_SELECTOR).length === 0;
}
