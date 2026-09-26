import { settingsRpc } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { registerCommands } from "./client/commands.ts";
import { createPickerHost } from "./client/picker.tsx";
import { CommandsSettingsScreen } from "./client/settings-screen.tsx";
import { setDisabledCommands } from "./client/settings-store.ts";
import { COMMANDS_SETTINGS } from "./shared/settings.ts";

export default function contribute(client: PluginClientContext) {
  const pickers = createPickerHost(client);
  const unregister = registerCommands(client, pickers);
  const removeSettings = client.addSettingsScreen({
    id: "commands",
    title: "Settings",
    icon: "Settings",
    Component: CommandsSettingsScreen,
  });

  let disposed = false;
  client
    .rpc(settingsRpc(COMMANDS_SETTINGS.id).read, {})
    .then((result) => {
      if (disposed || result.status !== "ready") return;
      const parsed = COMMANDS_SETTINGS.schema.safeParse(result.values);
      if (parsed.success) setDisabledCommands(parsed.data.disabled);
    })
    .catch(() => {});

  return () => {
    disposed = true;
    removeSettings();
    unregister();
    pickers.dispose();
  };
}
