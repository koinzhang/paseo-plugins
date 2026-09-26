type Listener = (disabled: ReadonlySet<string>) => void;

let disabled: ReadonlySet<string> = new Set();
const listeners = new Set<Listener>();

export function getDisabledCommands(): ReadonlySet<string> {
  return disabled;
}

export function setDisabledCommands(names: readonly string[]): void {
  const next = new Set(names);
  if (next.size === disabled.size && [...next].every((name) => disabled.has(name))) return;
  disabled = next;
  for (const listener of listeners) listener(disabled);
}

export function subscribeDisabledCommands(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
