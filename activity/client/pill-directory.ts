import type { PluginClientContext } from "@getpaseo/plugin/client";
import { listAllAgentPages } from "../shared/list-agent-pages.ts";

type AgentsApi = PluginClientContext["paseo"]["agents"];
type Update = Parameters<Parameters<AgentsApi["subscribe"]>[0]>[0];
type Agent = Extract<Update, { kind: "upsert" }>["agent"];

/** 0.8 has one shared directory slot. Plain paged reads own our fallback, never that slot. */
export function watchPillDirectory(
  agents: AgentsApi,
  onAgent: (agent: Agent) => void,
  onRemove: (agentId: string) => void,
  intervalMs = 15_000,
): () => void {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Update[] | null = null;
  let known = new Set<string>();
  function apply(update: Update) {
    if (update.kind === "remove") {
      known.delete(update.agentId);
      onRemove(update.agentId);
    } else {
      known.add(update.agent.id);
      onAgent(update.agent);
    }
  }
  // Opportunistic acceleration only; correctness does not depend on host observation.
  const unsubscribe = agents.subscribe((update) => {
    if (disposed) return;
    pending?.push(update);
    apply(update);
  });
  async function sync() {
    pending = [];
    try {
      const entries = await listAllAgentPages((cursor) => agents.list({
        page: { limit: 200, ...(cursor ? { cursor } : {}) },
      }));
      if (disposed) return;
      const snapshot = new Map(entries.map(({ agent }) => [agent.id, agent]));
      // Pushes received during pagination are newer than its snapshot.
      for (const update of pending) {
        if (update.kind === "remove") snapshot.delete(update.agentId);
        else snapshot.set(update.agent.id, update.agent);
      }
      for (const id of known) if (!snapshot.has(id)) onRemove(id);
      known = new Set(snapshot.keys());
      for (const agent of snapshot.values()) onAgent(agent);
    } catch (error) {
      if (!disposed) console.error("[activity] could not sync composer pills", error);
    } finally {
      pending = null;
      if (!disposed) timer = setTimeout(() => void sync(), intervalMs);
    }
  }
  void sync();
  return () => {
    disposed = true;
    unsubscribe();
    clearTimeout(timer);
  };
}
