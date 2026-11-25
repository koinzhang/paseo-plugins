import { type PluginWorkspacePanelProps, type WorkspaceRef, useWorkspace, useWorkspaces } from "@getpaseo/plugin/client";
import { Text, View } from "react-native";
import { InboxView } from "./inbox-surface.tsx";
import { usePanelPresenceReport } from "./panel-visibility.ts";

/** Explorer panel: the Inbox of one workspace. */
function WorkspaceInboxContent({
  theme, layout, navigation, workspaceRef,
}: PluginWorkspacePanelProps & { workspaceRef: WorkspaceRef }) {
  const workspace = useWorkspace(workspaceRef, ({ id, directory }) => ({ id, directory }));
  if (!workspace) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: "transparent" }}>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>Workspace unavailable.</Text>
      </View>
    );
  }
  return <InboxView theme={theme} layout={layout} navigation={navigation} workspace={workspace} />;
}

export function WorkspaceInboxPanel(props: PluginWorkspacePanelProps) {
  usePanelPresenceReport(props.workspaceId);
  const workspaces = useWorkspaces({
    hosts: [props.host.id],
    where: (workspace) => workspace.id === props.workspaceId,
  });
  const workspaceRef = workspaces[0];
  if (!workspaceRef) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: "transparent" }}>
        <Text style={{ color: props.theme.colors.foregroundMuted, fontSize: 12 }}>Workspace unavailable.</Text>
      </View>
    );
  }
  return <WorkspaceInboxContent {...props} workspaceRef={workspaceRef} />;
}
