import type { PluginServerContext } from "@getpaseo/plugin/server";
import { runAgentControl } from "./server/control.ts";
import { createDaemonConnection } from "./server/daemon.ts";
import { agentControl } from "./shared/rpc.ts";
import { COMMANDS_SETTINGS } from "./shared/settings.ts";

export default function contribute(server: PluginServerContext) {
  const daemon = createDaemonConnection();
  server.registerSettings(COMMANDS_SETTINGS);
  server.handle(agentControl, async (input) => runAgentControl(await daemon.get(), input));
  return () => daemon.close();
}
