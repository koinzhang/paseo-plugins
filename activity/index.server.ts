import { createBackgroundSync } from "./server/background-sync.ts";
import { homedir } from "node:os";
import type { PluginHandlerContext, PluginServerContext } from "@getpaseo/plugin/server";
import {
  createActivityByHourHandler,
  createActivityByDayHandler,
  createAgentCreationsHandler,
  createAgentLifetimeHandler,
  createAgentsHandler,
  createByProjectHandler,
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
import { createRpcCache } from "./server/rpc-cache.ts";
import { createUsageStore } from "./server/store.ts";
import { ingestTurnAfter } from "./server/turn-ingest.ts";
import {
  usageActivityByHourRpc,
  usageActivityByDayRpc,
  usageAgentCreationsRpc,
  usageAgentLifetimeRpc,
  usageAgentsRpc,
  usageAgentUnarchiveRpc,
  usageByProjectRpc,
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
  server.handle(usageByProjectRpc, read(usageByProjectRpc, createByProjectHandler(store)));
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

  const removeCreated = server.addHook("agent.create.after", async (event, context) => {
    void background.request(context.paseo);
    try {
      store.upsertAgents([agentRowFromHook(event.agent)]);
      console.log(`[activity] agent.created id=${event.agent.id}`);
    } catch (error) {
      console.error("[activity] failed to ingest agent.create.after", error);
    }
  });

  const removeArchived = server.addHook("agent.archive.after", async (event, context) => {
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
      console.error("[activity] failed to ingest agent.archive.after", error);
    }
  });

  const removeTurnEnded = server.addHook("agent.turn.after", async (event, context) => {
    void background.request(context.paseo);
    const signal = context.signal;
    try {
      const rows = await ingestTurnAfter(store, context.paseo, event.agent, event.turnId, {
        homeDir: homedir(),
        signal,
      });
      if (rows > 0 && !signal.aborted) {
        console.log(
          `[activity] turn.after agent=${event.agent.id} rows=${rows} total=${store.count()}`,
        );
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error("[activity] failed to ingest agent.turn.after", error);
      }
    }
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
