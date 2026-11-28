import type { PluginClientContext } from "@getpaseo/plugin/client";
import { settingsRpc } from "@getpaseo/plugin";
import { GlobalUsageSurface } from "./client/global-surface.tsx";
import { UsagePanel } from "./client/panel.tsx";
import { contributeAttentionPills } from "./client/attention-pill.tsx";
import { setActivitySettings } from "./client/activity-settings-store.ts";
import { contributeHeaderButtons } from "./client/header-button.ts";
import { contributePills } from "./client/pill.tsx";
import { ActivitySettingsScreen } from "./client/settings-screen.tsx";
import { ACTIVITY_SCREEN_ID, ActivitySidebarItem } from "./client/sidebar-item.tsx";
import { WorkspaceActivityPanel } from "./client/workspace-panel.tsx";
import { currentAppLanguage, watchAppLanguage } from "./client/use-app-language.ts";
import { activitySettings } from "./shared/activity-settings.ts";
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
  const removeSettingsScreen = client.addSettingsScreen({
    id: "activity",
    title: "Settings",
    icon: "Activity",
    Component: ActivitySettingsScreen,
  });

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

  let disposed = false;
  const readActivitySettings = () => {
    client
      .rpc(settingsRpc(activitySettings.id).read, {})
      .then((result) => {
        if (disposed || result.status !== "ready") return;
        const parsed = activitySettings.schema.safeParse(result.values);
        if (parsed.success) setActivitySettings(parsed.data);
      })
      .catch((error) => {
        if (!disposed) console.error("[activity] failed to read settings", error);
      });
  };
  readActivitySettings();
  const settingsEvents = client.paseo.observeEvents(["status.plugin_settings_changed"]);
  const stopSettingsEvents = settingsEvents.subscribe({
    snapshot: () => {},
    update: (message) => {
      if (message.type !== "status") return;
      const payload = message.payload;
      if (
        payload.status !== "plugin_settings_changed" ||
        payload.settingsId !== activitySettings.id
      )
        return;
      readActivitySettings();
    },
  });

  const stopUsagePills = contributePills(client);
  const stopAttentionPills = contributeAttentionPills(client);
  const stopHeaderButtons = contributeHeaderButtons(client);
  return () => {
    disposed = true;
    stopSettingsEvents();
    void settingsEvents
      .release()
      .catch((error) => console.error("[activity] failed to release settings events", error));
    removeSettingsScreen();
    stopLanguage();
    removeScopedCommands();
    stopUsagePills();
    stopAttentionPills();
    stopHeaderButtons();
  };
}
