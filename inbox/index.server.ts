import type { PluginServerContext } from "@getpaseo/plugin/server";
import { createDaemonConnection } from "./server/daemon.ts";
import { registerHandlers } from "./server/handlers.ts";
import { createProjectResolver } from "./server/project-key.ts";
import { InboxStore } from "./server/store.ts";
import { inboxFilterSettings } from "./shared/filter-settings.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(inboxFilterSettings);
  const store = new InboxStore();
  const daemon = createDaemonConnection();
  registerHandlers(server, { store, resolveProject: createProjectResolver(), daemon });
  return async () => {
    await daemon.close();
    store.close();
  };
}
