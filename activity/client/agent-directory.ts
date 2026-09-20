import type { PluginClientContext } from "@getpaseo/plugin/client";

export type AgentsApi = PluginClientContext["paseo"]["agents"];
export type DirectoryAgent = Awaited<ReturnType<AgentsApi["list"]>>["entries"][number]["agent"];
type ListResult = Awaited<ReturnType<AgentsApi["list"]>>;
export type DirectoryUpdate = Parameters<Parameters<AgentsApi["subscribe"]>[0]>[0];
export type DirectoryListener = (
  agents: ReadonlyMap<string, DirectoryAgent>,
  update?: DirectoryUpdate,
) => void;

const directories = new WeakMap<AgentsApi, {
  listen(listener: DirectoryListener): () => void;
}>();

/** One owned beta.2 observation per API, shared only by that API's consumers. */
export function watchAgentDirectory(
  agents: AgentsApi,
  listener: DirectoryListener,
  intervalMs = 15_000,
): () => void {
  let directory = directories.get(agents);
  if (!directory) {
    const listeners = new Set<DirectoryListener>();
    let snapshot: Map<string, DirectoryAgent> | undefined;
    let disposed = false;
    let connecting = false;
    let reading = false;
    let generation = 0;
    let pending: DirectoryUpdate[] = [];
    const lifetime = new AbortController();
    let controller: AbortController | undefined;
    let release: (() => Promise<void>) | undefined;
    const report = (error: unknown) => console.error("[activity] agent directory failed", error);
    const safeRelease = () => {
      const stop = release;
      release = undefined;
      if (stop) void stop().catch(report);
    };
    const publish = (update?: DirectoryUpdate) => {
      if (disposed || !snapshot) return;
      for (const callback of listeners) {
        try { callback(snapshot, update); } catch (error) { report(error); }
      }
    };
    const apply = (map: Map<string, DirectoryAgent>, update: DirectoryUpdate) => {
      if (update.kind === "remove") map.delete(update.agentId);
      else map.set(update.agent.id, update.agent);
    };
    async function read(first?: ListResult) {
      const run = ++generation;
      const signal = lifetime.signal;
      reading = true;
      pending = [];
      try {
        let page = first ?? await agents.list({
          filter: { includeArchived: true }, page: { limit: 200 }, signal,
        });
        const next = new Map<string, DirectoryAgent>();
        for (let pages = 0; ; pages++) {
          if (disposed || run !== generation) return;
          for (const { agent } of page.entries) next.set(agent.id, agent);
          if (!page.pageInfo.hasMore) break;
          if (!page.pageInfo.nextCursor || pages >= 99) throw new Error("Incomplete agent directory pagination");
          page = await agents.list({
            filter: { includeArchived: true },
            page: { limit: 200, cursor: page.pageInfo.nextCursor }, signal,
          });
        }
        for (const update of pending) apply(next, update);
        snapshot = next;
        publish();
      } catch (error) {
        if (!disposed && run === generation) report(error);
      } finally {
        if (run === generation) { reading = false; pending = []; }
      }
    }
    async function connect() {
      if (disposed || connecting || release) return;
      connecting = true;
      controller = new AbortController();
      try {
        const result = await agents.list({
          filter: { includeArchived: true }, page: { limit: 200 },
          subscribe: {}, signal: controller.signal,
        });
        if (disposed) {
          await result.subscription.release();
          return;
        }
        release = () => result.subscription.release();
        result.subscription.subscribe({
          // Called immediately and again after reconnect. Rebuild all pages each time.
          snapshot: (page) => { void read(page); },
          update: (message) => {
            if (disposed || message.type !== "agent_update") return;
            const update = message.payload;
            if (reading) pending.push(update);
            if (snapshot) {
              snapshot = new Map(snapshot);
              apply(snapshot, update);
              publish(update);
            }
          },
          error: (error) => {
            if (disposed) return;
            report(error);
            ++generation;
            reading = false;
            controller?.abort();
            safeRelease();
            void read();
          },
        });
      } catch (error) {
        if (!disposed) {
          report(error);
          await read();
        }
      } finally {
        connecting = false;
      }
    }
    const timer = setInterval(() => {
      if (!release) void connect();
      else if (!reading) void read();
    }, intervalMs);
    directory = {
      listen(callback) {
        listeners.add(callback);
        if (snapshot) callback(snapshot);
        return () => {
          listeners.delete(callback);
          if (listeners.size !== 0 || disposed) return;
          disposed = true;
          ++generation;
          clearInterval(timer);
          lifetime.abort();
          controller?.abort();
          safeRelease();
          directories.delete(agents);
        };
      },
    };
    directories.set(agents, directory);
    void connect();
  }
  return directory.listen(listener);
}
