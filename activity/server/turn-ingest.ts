import { homedir } from "node:os";
import type { PluginHookAgent, PluginHookContext } from "@getpaseo/plugin/server";
import { agentRowFromHook } from "./agents.ts";
import type { AgentTimelineItem } from "./host-types.ts";
import { ingestTimeline, ingestUserMessages } from "./ingest.ts";
import { resolveAgentModel } from "./resolve-model.ts";
import type { UsageStore } from "./store.ts";

/** Recent history is enough for immediacy; the background scan owns the full timeline. */
export const TURN_TAIL_LIMIT = 500;

type PaseoApi = PluginHookContext["paseo"];

/**
 * Paseo 0.13+ sends an empty `timeline` in `agent.turn.after`, so read the recent
 * history back through the SDK instead of trusting the hook payload.
 */
export async function refetchTimelineTail(
  paseo: PaseoApi,
  agentId: string,
  limit: number = TURN_TAIL_LIMIT,
): Promise<AgentTimelineItem[]> {
  const page = await paseo.agents.ref(agentId).timeline.refetch({
    projection: "canonical",
    direction: "tail",
    limit,
  });
  if (page.error) throw new Error(page.error);
  return page.entries.map(({ item }) => item);
}

export interface IngestTurnAfterOptions {
  homeDir?: string;
}

/**
 * Ingest one finished turn from a freshly read timeline tail.
 *
 * Returns the number of tool-call rows upserted. Calls already stored in a
 * terminal status cannot change from a snapshot, so they are skipped.
 */
export async function ingestTurnAfter(
  store: UsageStore,
  paseo: PaseoApi,
  agent: PluginHookAgent,
  options: IngestTurnAfterOptions = {},
): Promise<number> {
  const existing = store.getAgent(agent.id);
  store.upsertAgents([
    agentRowFromHook(agent, {
      createdAt: existing?.createdAt,
      archivedAt: existing?.archivedAt,
    }),
  ]);

  const model = await resolveAgentModel(paseo, agent.id);
  const timeline = await refetchTimelineTail(paseo, agent.id);
  store.upsertUserMessages(ingestUserMessages(timeline, agent, { model }));
  store.pruneReplayDuplicateMessages(agent.id);

  const settled = store.terminalCallIds(agent.id);
  const pending = timeline.filter(
    (item) => item.type !== "tool_call" || !settled.has(item.callId),
  );
  const rows = ingestTimeline(pending, agent, null, {
    homeDir: options.homeDir ?? homedir(),
  });
  if (rows.length === 0) return 0;
  store.upsertMany(rows);
  return rows.length;
}
