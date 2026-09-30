import { type PluginWorkspacePanelProps, useWorkspace } from "@getpaseo/plugin/client";
import { Text, View } from "react-native";
import { InboxView } from "./inbox-surface.tsx";
import { usePanelPresenceReport } from "./panel-visibility.ts";

/** Explorer panel: the Inbox of one workspace. */
export function WorkspaceInboxPanel({ theme, layout, navigation, workspaceId }: PluginWorkspacePanelProps) {
  usePanelPresenceReport(workspaceId);
  const workspace = useWorkspace(workspaceId, ({ id, directory }) => ({ id, directory }));
  if (!workspace) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.surface0 }}>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Workspace unavailable.</Text>
      </View>
    );
  }
  return <InboxView theme={theme} layout={layout} navigation={navigation} workspace={workspace} />;
}
