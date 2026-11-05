import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GlobalUsageSurface } from "./client/global-surface.tsx";
import { UsagePanel } from "./client/panel.tsx";
import { contributeAttentionPills } from "./client/attention-pill.tsx";
import { contributeHeaderButtons } from "./client/header-button.ts";
import { contributePills } from "./client/pill.tsx";
import { ACTIVITY_SCREEN_ID, ActivitySidebarItem } from "./client/sidebar-item.tsx";
import { WorkspaceActivityPanel } from "./client/workspace-panel.tsx";
import { currentAppLanguage, watchAppLanguage } from "./client/use-app-language.ts";
import { messagesFor } from "./shared/i18n.ts";

const GLOBAL_SCREEN_ID = ACTIVITY_SCREEN_ID;

/** Command titles follow the app language; the host has no update(), so re-register on change. */
function addScopedCommands(client: PluginClientContext): () => void {
  const { commands } = messagesFor(currentAppLanguage());
  const removeAgent = client.addCommandCenterItem({
    id: "open-usage",
    title: commands.agentActivity,
    icon: "Activity",
    keywords: ["activity", "current", "agent", "tool", "usage", "shell", "skill", "mcp", "stats"],
    context: "agent",
    onSelect: ({ openPanel }) => {
      openPanel("usage");
    },
  });
  const removeWorkspace = client.addCommandCenterItem({
    id: "open-workspace-activity",
    title: commands.workspaceActivity,
    icon: "Activity",
    keywords: ["activity", "workspace", "explorer", "tool", "usage", "shell", "skill", "mcp", "stats"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("workspace-activity", { location: "explorer" });
    },
  });
  return () => {
    removeAgent();
    removeWorkspace();
  };
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({
    id: GLOBAL_SCREEN_ID,
    title: "Activity",
    Component: GlobalUsageSurface,
  });
  client.addSidebarHeaderItem({
    id: GLOBAL_SCREEN_ID,
    title: "Activity",
    Component: ActivitySidebarItem,
  });

  client.addAgentPanel({
    id: "usage",
    title: "Activity",
    icon: "Activity",
    Component: UsagePanel,
  });

  client.addWorkspacePanel({
    id: "workspace-activity",
    title: "Activity",
    icon: "Activity",
    locations: ["explorer"],
    Component: WorkspaceActivityPanel,
  });

  client.addCommandCenterItem({
    id: "open-usage-global",
    title: "Activity",
    icon: "Activity",
    keywords: ["activity", "tool", "usage", "provider", "all", "global", "sidebar"],
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: GLOBAL_SCREEN_ID });
    },
  });

  let removeScopedCommands = addScopedCommands(client);
  const stopLanguage = watchAppLanguage(() => {
    removeScopedCommands();
    removeScopedCommands = addScopedCommands(client);
  });

  const stopUsagePills = contributePills(client);
  const stopAttentionPills = contributeAttentionPills(client);
  const stopHeaderButtons = contributeHeaderButtons(client);
  return () => {
    stopLanguage();
    removeScopedCommands();
    stopUsagePills();
    stopAttentionPills();
    stopHeaderButtons();
  };
}
