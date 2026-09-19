import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { LOG_PREFIX } from "../shared/plugin-id.ts";
import type { UsageStore } from "./store.ts";
import { defaultDataDir } from "./store.ts";
import { agentRowFromSnapshot, agentsFromToolCalls } from "./agents.ts";
import { resyncAgents } from "./handlers.ts";

type PaseoApi = PluginHandlerContext["paseo"];

// Bump when historical ingestion semantics change, not on UI-only releases.
const BACKFILL_VERSION = 1;
const CHECK_INTERVAL_MS = 5 * 60_000;

export function createBackgroundSync(store: UsageStore, options: {
  path?: string;
  version?: number;
  scan?: typeof resyncAgents;
} = {}) {
  const path = options.path ?? join(defaultDataDir(), "history-checkpoints.json");
  const version = options.version ?? BACKFILL_VERSION;
  const scan = options.scan ?? resyncAgents;
  let checkpoints: Record<string, string> = Object.create(null);
  try {
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (saved.version === version && saved.agents && typeof saved.agents === "object") {
      checkpoints = Object.assign(Object.create(null), saved.agents);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[activity] history checkpoints unavailable; will rebuild", error);
    }
  }
  const controller = new AbortController();
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sdk: PaseoApi | undefined;

  function persistCheckpoints(next: Record<string, string>) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.tmp`, JSON.stringify({ version, agents: next }), { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
    checkpoints = next;
  }

  async function check(paseo: PaseoApi) {
    const listed = await paseo.agents.list();
    if (controller.signal.aborted) return;
    // Directory synchronization belongs to the background task, never a UI read.
    store.upsertAgents(listed.entries.map(({ agent }) => agentRowFromSnapshot(agent)));
    const known = new Set(store.selectAgents().map(agent => agent.agentId));
    store.upsertAgents(agentsFromToolCalls(store.select()).filter(agent => !known.has(agent.agentId)));

    const liveIds = new Set(listed.entries.map(({ agent }) => agent.id));
    const pruned: Record<string, string> = Object.create(null);
    for (const [id, stamp] of Object.entries(checkpoints)) {
      if (liveIds.has(id)) pruned[id] = stamp;
    }
    if (Object.keys(pruned).length !== Object.keys(checkpoints).length) {
      persistCheckpoints(pruned);
    }

    for (const { agent } of listed.entries) {
      if (controller.signal.aborted) return;
      const stamp = `${agent.updatedAt}:${agent.lastUserMessageAt ?? ""}`;
      if (checkpoints[agent.id] === stamp) continue;
      const result = await scan(store, paseo, [agent.id], controller.signal, listed.entries);
      if (controller.signal.aborted) return;
      if (result.errors.length || result.syncedAgents !== 1) {
        console.error("[activity] background history scan incomplete", agent.id, result.errors);
        continue;
      }
      persistCheckpoints({ ...checkpoints, [agent.id]: stamp });
    }
  }

  function request(paseo: PaseoApi): Promise<void> {
    if (controller.signal.aborted) return Promise.resolve();
    sdk = paseo;
    if (running) return running;
    if (timer) return Promise.resolve();
    running = check(paseo).catch(error => {
      if (!controller.signal.aborted) console.error("[activity] background history check failed", error);
    }).finally(() => {
      running = undefined;
      if (!controller.signal.aborted) {
        timer = setTimeout(() => {
          timer = undefined;
          if (sdk) void request(sdk);
        }, CHECK_INTERVAL_MS);
        timer.unref();
      }
    });
    return running;
  }

  return {
    request,
    stop() {
      controller.abort();
      if (timer) clearTimeout(timer);
    },
  };
}
