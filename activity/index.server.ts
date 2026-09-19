import { createBackgroundSync } from "./server/background-sync.ts";
import { homedir } from "node:os";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  createActivityByDayHandler,
  createAgentsHandler,
  createByProviderHandler,
  createExportHandler,
  createListHandler,
  createMcpByToolHandler,
  createReadSkillHandler,
  createSkillsByNameHandler,
  createSummaryHandler,
  createUnarchiveAgentHandler,
} from "./server/handlers.ts";
import { agentRowFromHook } from "./server/agents.ts";
import { ingestTimeline, ingestUserMessages } from "./server/ingest.ts";
import { resolveAgentModel } from "./server/resolve-model.ts";
import { createUsageStore } from "./server/store.ts";
import {
  usageActivityByDayRpc,
  usageAgentsRpc,
  usageAgentUnarchiveRpc,
  usageByProviderRpc,
  usageExportRpc,
  usageHostInfoRpc,
  usageListRpc,
  usageMcpByToolRpc,
  usageReadSkillRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "./shared/usage.ts";
import { explorerAgentDisplaySettings } from "./shared/explorer-agent-display.ts";

export default function contribute(server: PluginServerContext) {
  const store = createUsageStore();
  const background = createBackgroundSync(store);
  console.log(`[activity] store ready (driver=${store.driver})`);
  server.registerSettings(explorerAgentDisplaySettings);

  server.handle(usageSummaryRpc, (input, context) => {
    void background.request(context.paseo);
    return createSummaryHandler(store)(input);
  });
  server.handle(usageListRpc, (input, context) => {
    void background.request(context.paseo);
    return createListHandler(store)(input);
  });
  server.handle(usageSkillsByNameRpc, (input, context) => {
    void background.request(context.paseo);
    return createSkillsByNameHandler(store)(input, context);
  });
  server.handle(usageMcpByToolRpc, (input, context) => {
    void background.request(context.paseo);
    return createMcpByToolHandler(store)(input);
  });
  server.handle(usageByProviderRpc, (input, context) => {
    void background.request(context.paseo);
    return createByProviderHandler(store)(input);
  });
  server.handle(usageAgentsRpc, (input, context) => {
    void background.request(context.paseo);
    return createAgentsHandler(store)(input);
  });
  server.handle(usageAgentUnarchiveRpc, createUnarchiveAgentHandler(store));
  server.handle(usageActivityByDayRpc, (input, context) => {
    void background.request(context.paseo);
    return createActivityByDayHandler(store)(input);
  });
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
        // mcpServers resolved inside ingestTimeline (OpenCode config + paseo inject + agent persistence)
        const rows = ingestTimeline(event.timeline, event.agent, null, {
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
