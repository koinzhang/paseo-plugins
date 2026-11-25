import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import { CustomizeSidebarItem } from "./client/sidebar-item.tsx";
import { CUSTOMIZE_SCREEN_ID } from "./client/screen-id.ts";
import { CustomizeSurface } from "./client/surface.tsx";
import { openCustomizeFromAgent } from "./client/slash-command.ts";
import { customizeTranslations } from "./client/translations.ts";
import { trackWorkspaceRoute } from "./client/web.ts";

function addCommands(client: PluginClientContext): () => void {
  const removeCommandCenterItem = client.addCommandCenterItem({
    id: "open-customize",
    title: customizeTranslations.message("title"),
    icon: "FolderCog",
    keywords: ["customize", "agents.md", "claude.md", "rules", "skills", "mcp", "instructions", "provider"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: CUSTOMIZE_SCREEN_ID });
    },
  });
  const removeSlashCommand = client.addSlashCommand({
    name: "customize",
    description: customizeTranslations.message("openBoard"),
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

  const removeCommands = addCommands(client);
  return () => {
    stopRouteTracking();
    removeCommands();
  };
}
