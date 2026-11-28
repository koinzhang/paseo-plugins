import {
  ACTIVITY_SETTINGS_DEFAULTS,
  sameActivitySettings,
  type ActivitySettings,
} from "../shared/activity-settings.ts";

type Listener = (settings: ActivitySettings) => void;

let current: ActivitySettings = ACTIVITY_SETTINGS_DEFAULTS;
const listeners = new Set<Listener>();

export function getActivitySettings(): ActivitySettings {
  return current;
}

export function setActivitySettings(next: ActivitySettings): void {
  if (sameActivitySettings(current, next)) return;
  current = next;
  for (const listener of listeners) listener(current);
}

export function subscribeActivitySettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
