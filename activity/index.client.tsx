import type { PluginClientContext } from "@getpaseo/plugin/client";
import { copyText } from "@getpaseo/plugin/client/react-native";
import { GlobalUsageSurface } from "./client/global-surface.tsx";
import { UsagePanel } from "./client/panel.tsx";
import { contributePills } from "./client/pill.tsx";
import { usageExportRpc } from "./shared/usage.ts";

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

  client.addCommandCenterItem({
    id: "open-usage-global",
    title: "Open Activity (all providers)",
    icon: "Activity",
    keywords: ["activity", "tool", "usage", "provider", "all", "global", "sidebar"],
    context: "global",
    onSelect({ openSurface }) {
      openSurface(GLOBAL_SURFACE_ID);
    },
  });

  client.addCommandCenterItem({
    id: "open-usage",
    title: "Activity",
    icon: "Activity",
    keywords: ["activity", "tool", "usage", "shell", "skill", "mcp", "stats"],
    context: "agent",
    onSelect: ({ openPanel }) => {
      openPanel("usage");
    },
  });

  client.addCommandCenterItem({
    id: "export-usage",
    title: "Export activity report",
    icon: "FileDown",
    keywords: ["export", "report", "markdown", "activity", "tool usage"],
    context: "agent",
    async onSelect({ agent, rpc }) {
      const result = await rpc(usageExportRpc, { agentId: agent?.id });
      await copyText(result.markdown);
    },
  });

  return contributePills(client);
}
