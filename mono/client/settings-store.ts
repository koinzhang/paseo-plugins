import { DEFAULT_MONO_SETTINGS, sameMonoSettings, type MonoSettings } from "../shared/settings";

type Listener = (settings: MonoSettings) => void;

let current: MonoSettings = DEFAULT_MONO_SETTINGS;
const listeners = new Set<Listener>();

export function getMonoSettings(): MonoSettings {
  return current;
}

export function setMonoSettings(next: MonoSettings): void {
  if (sameMonoSettings(current, next)) return;
  current = next;
  for (const listener of listeners) listener(current);
}

export function subscribeMonoSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
