import type { InboxChange } from "../shared/changes.ts";

interface Subscriber {
  invalidate(): void;
  stop(): void;
}

export class InboxChanges {
  private readonly subscribers = new Set<Subscriber>();
  private closed = false;

  invalidate(): void {
    for (const subscriber of this.subscribers) subscriber.invalidate();
  }

  subscribe({ push, signal }: { push(event: InboxChange): Promise<void>; signal: AbortSignal }): Promise<void> {
    if (this.closed || signal.aborted) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      let active = true;
      let pending = false;
      let sending = false;

      const stop = (error?: unknown) => {
        if (!active) return;
        active = false;
        pending = false;
        this.subscribers.delete(subscriber);
        signal.removeEventListener("abort", onAbort);
        if (error !== undefined) reject(error);
        else resolve();
      };
      const onAbort = () => stop();

      const send = async () => {
        if (!active || sending) return;
        sending = true;
        try {
          while (active && pending) {
            pending = false;
            await push({ type: "invalidate" });
          }
        } catch (error) {
          stop(error);
        } finally {
          sending = false;
        }
      };

      const subscriber: Subscriber = {
        invalidate: () => {
          if (!active) return;
          pending = true;
          void send();
        },
        stop: () => stop(),
      };
      this.subscribers.add(subscriber);
      signal.addEventListener("abort", onAbort, { once: true });
      subscriber.invalidate();
    });
  }

  close(): void {
    this.closed = true;
    for (const subscriber of this.subscribers) subscriber.stop();
  }
}
