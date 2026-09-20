import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GlobalUsageSurface } from "./client/global-surface.tsx";
import { UsagePanel } from "./client/panel.tsx";
import { contributeAttentionPills } from "./client/attention-pill.tsx";
import { contributePills } from "./client/pill.tsx";
import { WorkspaceActivityPanel } from "./client/workspace-panel.tsx";

const GLOBAL_SURFACE_ID = "activity";

export default function contribute(client: PluginClientContext) {
  client.addSurface(GLOBAL_SURFACE_ID, GlobalUsageSurface);
  client.addSidebarItem({
    id: "activity",
    title: "Activity",
    icon: "Activity",
    surface: GLOBAL_SURFACE_ID,
  });

  client.addWorkspacePanel({
    id: "usage",
    title: "Activity",
    icon: "Activity",
    context: "agent",
    Component: UsagePanel,
  });

  client.addWorkspacePanel({
    id: "workspace-activity",
    title: "Activity",
    icon: "Activity",
    context: "workspace",
    locations: ["explorer"],
    Component: WorkspaceActivityPanel,
  });

  client.addCommandCenterItem({
    id: "open-usage-global",
    title: "Activity",
    icon: "Activity",
    keywords: ["activity", "tool", "usage", "provider", "all", "global", "sidebar"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface(GLOBAL_SURFACE_ID);
    },
  });

  client.addCommandCenterItem({
    id: "open-usage",
    title: "Agent Activity",
    icon: "Activity",
    keywords: ["activity", "current", "agent", "tool", "usage", "shell", "skill", "mcp", "stats"],
    context: "agent",
    onSelect: ({ openPanel }) => {
      openPanel("usage");
    },
  });

  client.addCommandCenterItem({
    id: "open-workspace-activity",
    title: "Workspace Activity",
    icon: "Activity",
    keywords: ["activity", "workspace", "explorer", "tool", "usage", "shell", "skill", "mcp", "stats"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("workspace-activity", { location: "explorer" });
    },
  });

  const stopUsagePills = contributePills(client);
  const stopAttentionPills = contributeAttentionPills(client);
  return () => {
    stopUsagePills();
    stopAttentionPills();
  };
}
