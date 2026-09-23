import { createBackgroundSync } from "./server/background-sync.ts";
import { homedir } from "node:os";
import type { PluginHandlerContext, PluginServerContext } from "@getpaseo/plugin/server";
import {
  createActivityByHourHandler,
  createActivityByDayHandler,
  createAgentCreationsHandler,
  createAgentLifetimeHandler,
  createAgentsHandler,
  createByProviderHandler,
  createExportHandler,
  createListHandler,
  createMcpByToolHandler,
  createReadSkillHandler,
  createRecentMcpCallsHandler,
  createRecentSkillCallsHandler,
  createSkillsByNameHandler,
  createSummaryHandler,
  createUnarchiveAgentHandler,
} from "./server/handlers.ts";
import { agentRowFromHook } from "./server/agents.ts";
import { ingestTimeline, ingestUserMessages } from "./server/ingest.ts";
import { resolveAgentModel } from "./server/resolve-model.ts";
import { createRpcCache } from "./server/rpc-cache.ts";
import { createUsageStore } from "./server/store.ts";
import {
  usageActivityByHourRpc,
  usageActivityByDayRpc,
  usageAgentCreationsRpc,
  usageAgentLifetimeRpc,
  usageAgentsRpc,
  usageAgentUnarchiveRpc,
  usageByProviderRpc,
  usageExportRpc,
  usageHostInfoRpc,
  usageListRpc,
  usageMcpByToolRpc,
  usageReadSkillRpc,
  usageRecentMcpCallsRpc,
  usageRecentSkillCallsRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "./shared/usage.ts";
import { explorerAgentDisplaySettings } from "./shared/explorer-agent-display.ts";

export default function contribute(server: PluginServerContext) {
  const store = createUsageStore();
  const background = createBackgroundSync(store);
  const cache = createRpcCache({ generation: () => store.generation() });
  console.log(`[activity] store ready (driver=${store.driver})`);
  server.registerSettings(explorerAgentDisplaySettings);

  /** Cached read RPC that also nudges the background history check. */
  function read<I, O>(
    rpc: { name: string },
    handler: (input: I, context: PluginHandlerContext) => Promise<O>,
  ) {
    const cached = cache.wrap(rpc.name, handler);
    return (input: I, context: PluginHandlerContext) => {
      void background.request(context.paseo);
      return cached(input, context);
    };
  }

  server.handle(usageSummaryRpc, read(usageSummaryRpc, createSummaryHandler(store)));
  server.handle(usageListRpc, read(usageListRpc, createListHandler(store)));
  server.handle(usageSkillsByNameRpc, read(usageSkillsByNameRpc, createSkillsByNameHandler(store)));
  server.handle(
    usageRecentSkillCallsRpc,
    read(usageRecentSkillCallsRpc, createRecentSkillCallsHandler(store)),
  );
  server.handle(
    usageRecentMcpCallsRpc,
    read(usageRecentMcpCallsRpc, createRecentMcpCallsHandler(store)),
  );
  server.handle(usageMcpByToolRpc, read(usageMcpByToolRpc, createMcpByToolHandler(store)));
  server.handle(usageByProviderRpc, read(usageByProviderRpc, createByProviderHandler(store)));
  server.handle(usageAgentsRpc, read(usageAgentsRpc, createAgentsHandler(store)));
  server.handle(usageAgentUnarchiveRpc, createUnarchiveAgentHandler(store));
  server.handle(usageActivityByDayRpc, read(usageActivityByDayRpc, createActivityByDayHandler(store)));
  server.handle(
    usageActivityByHourRpc,
    read(usageActivityByHourRpc, createActivityByHourHandler(store)),
  );
  server.handle(
    usageAgentLifetimeRpc,
    read(usageAgentLifetimeRpc, createAgentLifetimeHandler(store)),
  );
  server.handle(
    usageAgentCreationsRpc,
    read(usageAgentCreationsRpc, createAgentCreationsHandler(store)),
  );
  server.handle(usageExportRpc, createExportHandler(store));
  server.handle(usageHostInfoRpc, () => ({ homeDir: homedir() }));
  server.handle(usageReadSkillRpc, createReadSkillHandler());

  const removeCreated = server.on("agent.created", (event, context) => {
    void background.request(context.paseo);
    try {
      store.upsertAgents([agentRowFromHook(event.agent)]);
      console.log(`[activity] agent.created id=${event.agent.id}`);
    } catch (error) {
      console.error("[activity] failed to ingest agent.created", error);
    }
  });

  const removeArchived = server.on("agent.archived", (event, context) => {
    void background.request(context.paseo);
    try {
      store.upsertAgents([
        agentRowFromHook(event.agent, {
          archivedAt: event.archivedAt,
          createdAt: store.getAgent(event.agent.id)?.createdAt,
        }),
      ]);
      console.log(`[activity] agent.archived id=${event.agent.id}`);
    } catch (error) {
      console.error("[activity] failed to ingest agent.archived", error);
    }
  });

  const removeTurnEnded = server.on("agent.turn_ended", (event, context) => {
    void background.request(context.paseo);
    void (async () => {
      try {
        const existing = store.getAgent(event.agent.id);
        store.upsertAgents([
          agentRowFromHook(event.agent, {
            createdAt: existing?.createdAt,
            archivedAt: existing?.archivedAt,
          }),
        ]);
        const model = await resolveAgentModel(context.paseo, event.agent.id);
        store.upsertUserMessages(
          ingestUserMessages(event.timeline, event.agent, { model }),
        );
        // event.timeline is the whole history; calls already stored in a terminal
        // status cannot change from a live snapshot, so only the rest are upserted.
        const settled = store.terminalCallIds(event.agent.id);
        const pending = event.timeline.filter(
          (item) => item.type !== "tool_call" || !settled.has(item.callId),
        );
        const rows = ingestTimeline(pending, event.agent, null, {
          homeDir: homedir(),
        });
        if (rows.length > 0) {
          store.upsertMany(rows);
          console.log(
            `[activity] turn_ended agent=${event.agent.id} rows=${rows.length} total=${store.count()}`,
          );
        }
      } catch (error) {
        console.error("[activity] failed to ingest agent.turn_ended", error);
      }
    })();
  });

  return () => {
    background.stop();
    removeCreated();
    removeArchived();
    removeTurnEnded();
    try {
      store.close();
    } catch (error) {
      console.error("[activity] failed to close store", error);
    }
  };
}
