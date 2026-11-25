import type { PluginServerContext } from "@getpaseo/plugin/server";
import { InboxChanges } from "./server/changes.ts";
import { createDaemonConnection } from "./server/daemon.ts";
import { registerHandlers } from "./server/handlers.ts";
import { createProjectResolver } from "./server/project-key.ts";
import { InboxStore } from "./server/store.ts";
import { inboxFilterSettings } from "./shared/filter-settings.ts";
import { itemsChanged } from "./shared/changes.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(inboxFilterSettings);
  const changes = new InboxChanges();
  const store = new InboxStore({ onChange: () => changes.invalidate() });
  const daemon = createDaemonConnection();
  server.handle(itemsChanged, (_input, context) => changes.subscribe(context));
  const hooks = [
    server.addHook("workspace.archive.after", async () => changes.invalidate()),
    server.addHook("workspace.create.after", async () => changes.invalidate()),
    server.addHook("agent.archive.after", async () => changes.invalidate()),
    server.addHook("agent.create.after", async () => changes.invalidate()),
  ];
  registerHandlers(server, { store, resolveProject: createProjectResolver(), daemon, changes });
  return async () => {
    for (const remove of hooks) remove();
    changes.close();
    try {
      await daemon.close();
    } finally {
      store.close();
    }
  };
}
