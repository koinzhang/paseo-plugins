import { pillDataIsEmpty, type UsagePillData } from "./pill-data-cache.ts";

/** Recheck hidden pills without showing empty chrome; discard results after removal. */
export function createHiddenPillRecheck(
  load: () => Promise<UsagePillData>,
  isCurrentAndHidden: () => boolean,
  show: (data: UsagePillData) => void,
): () => Promise<void> {
  let running = false;
  return async () => {
    if (running || !isCurrentAndHidden()) return;
    running = true;
    try {
      const data = await load();
      if (isCurrentAndHidden() && !pillDataIsEmpty(data)) show(data);
    } catch (error) {
      if (isCurrentAndHidden()) console.error("[activity] hidden pill recheck failed", error);
    } finally {
      running = false;
    }
  };
}
