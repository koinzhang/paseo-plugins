import type { PluginSubscriptionHandle } from "@getpaseo/plugin/client";

type Subscribe = (onEvent: () => void, onClosed: (error?: Error) => void) => PluginSubscriptionHandle;

export function watchInboxChanges(
  subscribe: Subscribe,
  refresh: () => void,
  retryMs = 10_000,
  report: (error: unknown) => void = (error) => console.error("[inbox] change subscription failed", error),
): () => void {
  let disposed = false;
  let current: PluginSubscriptionHandle | null = null;

  const connect = () => {
    if (disposed || current) return;
    refresh();
    let handle: PluginSubscriptionHandle | undefined;
    let closed = false;
    const onClosed = (error?: Error) => {
      if (closed) return;
      closed = true;
      if (disposed || (current && current !== handle)) return;
      current = null;
      if (error) report(error);
      refresh();
    };
    try {
      handle = subscribe(
        () => {
          if (!disposed && !closed && (!current || current === handle)) refresh();
        },
        onClosed,
      );
      if (disposed || closed) {
        handle();
        return;
      }
      current = handle;
      const owned = handle;
      void owned.ready.then(
        () => {
          if (!disposed && current === owned) refresh();
        },
        (error: unknown) => {
          if (disposed || current !== owned) return;
          closed = true;
          current = null;
          owned();
          report(error);
          refresh();
        },
      );
    } catch (error) {
      closed = true;
      report(error);
      refresh();
    }
  };

  const timer = setInterval(connect, retryMs);
  connect();
  return () => {
    disposed = true;
    clearInterval(timer);
    const handle = current;
    current = null;
    handle?.();
  };
}
