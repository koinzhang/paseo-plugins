import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import { CustomizeSidebarItem } from "./client/sidebar-item.tsx";
import { CUSTOMIZE_SCREEN_ID } from "./client/screen-id.ts";
import { CustomizeSurface } from "./client/surface.tsx";
import { openCustomizeFromAgent } from "./client/slash-command.ts";
import { currentAppLanguage, watchAppLanguage } from "./client/use-app-language.ts";
import { trackWorkspaceRoute } from "./client/web.ts";
import { messagesFor } from "./shared/i18n.ts";

/** Command titles follow the app language; the host has no update(), so re-register on change. */
function addCommands(client: PluginClientContext): () => void {
  const messages = messagesFor(currentAppLanguage());
  const removeCommandCenterItem = client.addCommandCenterItem({
    id: "open-customize",
    title: messages.title,
    icon: "FolderCog",
    keywords: ["customize", "agents.md", "claude.md", "rules", "skills", "mcp", "instructions", "provider"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: CUSTOMIZE_SCREEN_ID });
    },
  });
  const removeSlashCommand = client.addSlashCommand({
    name: "customize",
    description: messages.openBoard,
    argumentHint: "",
    context: "agent",
    onSubmit: openCustomizeFromAgent,
  });
  return () => {
    removeSlashCommand();
    removeCommandCenterItem();
  };
}

export default function contribute(client: PluginClientContext) {
  const stopRouteTracking = Platform.OS === "web" ? trackWorkspaceRoute() : () => {};
  client.addScreen({
    id: CUSTOMIZE_SCREEN_ID,
    title: "Customize",
    Component: CustomizeSurface,
  });
  client.addSidebarHeaderItem({
    id: CUSTOMIZE_SCREEN_ID,
    title: "Customize",
    Component: CustomizeSidebarItem,
  });

  let removeCommands = addCommands(client);
  const stopLanguage = watchAppLanguage(() => {
    removeCommands();
    removeCommands = addCommands(client);
  });
  return () => {
    stopRouteTracking();
    stopLanguage();
    removeCommands();
  };
}
