import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import { CustomizeSurface } from "./client/surface.tsx";
import { openCustomizeFromAgent } from "./client/slash-command.ts";
import { currentAppLanguage, watchAppLanguage } from "./client/use-app-language.ts";
import { trackWorkspaceRoute } from "./client/web.ts";
import { messagesFor } from "./shared/i18n.ts";

const SURFACE_ID = "customize";

/** Command titles follow the app language; the host has no update(), so re-register on change. */
function addCommands(client: PluginClientContext): () => void {
  const description = messagesFor(currentAppLanguage()).openBoard;
  const removeCommandCenterItem = client.addCommandCenterItem({
    id: "open-customize",
    title: description,
    icon: "FolderCog",
    keywords: ["customize", "agents.md", "claude.md", "rules", "skills", "mcp", "instructions", "provider"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface(SURFACE_ID);
    },
  });
  const removeSlashCommand = client.addSlashCommand({
    name: "customize",
    description,
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
  client.addSurface(SURFACE_ID, CustomizeSurface);
  client.addSidebarItem({
    id: "customize",
    title: "Customize",
    icon: "FolderCog",
    surface: SURFACE_ID,
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
