import { homedir } from "node:os";
import type { PluginHookAgent, PluginHookContext } from "@getpaseo/plugin/server";
import { agentRowFromHook } from "./agents.ts";
import type { AgentTimelineItem } from "./host-types.ts";
import { ingestTimeline, ingestUserMessages } from "./ingest.ts";
import { resolveAgentModel } from "./resolve-model.ts";
import type { UsageStore } from "./store.ts";

type PaseoApi = PluginHookContext["paseo"];

/**
 * Read the latest complete turn and keep only entries belonging to the hook's turn.
 */
export async function refetchTurnTimeline(
  paseo: PaseoApi,
  agentId: string,
  turnId: string | null,
): Promise<AgentTimelineItem[]> {
  if (turnId === null) return [];
  const page = await paseo.agents.ref(agentId).timeline.refetch({
    direction: "tail",
    limit: 1,
    wholeTurns: true,
  });
  if (page.error) throw new Error(page.error);
  return page.entries.filter((entry) => entry.turnId === turnId).map(({ item }) => item);
}

export interface IngestTurnAfterOptions {
  homeDir?: string;
  signal?: AbortSignal;
}

/**
 * Ingest one finished turn from a freshly read complete turn.
 *
 * Returns the number of tool-call rows upserted. Calls already stored in a
 * terminal status cannot change from a snapshot, so they are skipped.
 */
export async function ingestTurnAfter(
  store: UsageStore,
  paseo: PaseoApi,
  agent: PluginHookAgent,
  turnId: string | null,
  options: IngestTurnAfterOptions = {},
): Promise<number> {
  if (options.signal?.aborted) return 0;
  const existing = store.getAgent(agent.id);
  store.upsertAgents([
    agentRowFromHook(agent, {
      createdAt: existing?.createdAt,
      archivedAt: existing?.archivedAt,
    }),
  ]);
  if (turnId === null) return 0;

  const model = await resolveAgentModel(paseo, agent.id);
  if (options.signal?.aborted) return 0;
  const timeline = await refetchTurnTimeline(paseo, agent.id, turnId);
  if (options.signal?.aborted) return 0;
  if (timeline.length === 0) return 0;
  store.upsertUserMessages(ingestUserMessages(timeline, agent, { model, turnId }));
  store.pruneReplayDuplicateMessages(agent.id);

  const settled = store.terminalCallIds(agent.id);
  const pending = timeline.filter(
    (item) => item.type !== "tool_call" || !settled.has(item.callId),
  );
  const rows = ingestTimeline(pending, agent, turnId, {
    homeDir: options.homeDir ?? homedir(),
  });
  if (rows.length === 0) return 0;
  store.upsertMany(rows);
  return rows.length;
}
