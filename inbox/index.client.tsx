import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeHeaderButtons } from "./client/header-button.ts";
import { InboxSurface } from "./client/inbox-surface.tsx";
import { notifyItemsChanged, requestDraft, requestSelection } from "./client/selection.ts";
import { WorkspaceInboxPanel } from "./client/workspace-panel.tsx";
import { saveNote, starAgent } from "./shared/contracts.ts";
import { parseInboxCommand } from "./shared/slash-command.ts";

const SURFACE = "inbox";

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addSurface(SURFACE, InboxSurface),
    client.addSidebarItem({ id: SURFACE, title: "Inbox", icon: "Inbox", surface: SURFACE }),
    client.addWorkspacePanel({
      id: "workspace-inbox",
      title: "Inbox",
      icon: "Inbox",
      context: "workspace",
      locations: ["explorer"],
      Component: WorkspaceInboxPanel,
    }),
    client.addCommandCenterItem({
      id: "open",
      title: "Inbox",
      icon: "Inbox",
      keywords: ["open"],
      context: "global",
      onSelect: ({ openSurface }) => openSurface(SURFACE),
    }),
    client.addCommandCenterItem({
      id: "star-agent",
      title: "Add agent to Inbox",
      icon: "Star",
      keywords: ["star", "favorite", "bookmark", "inbox"],
      context: "agent",
      async onSelect({ agent, rpc, openSurface }) {
        const { item } = await rpc(starAgent, { agentId: agent.id });
        requestSelection(item.id);
        openSurface(SURFACE);
      },
    }),
    client.addCommandCenterItem({
      id: "quick-note",
      title: "New Inbox note",
      icon: "NotebookPen",
      keywords: ["note", "inbox", "capture"],
      context: "workspace",
      onSelect({ workspace, openSurface }) {
        requestDraft(workspace.directory);
        openSurface(SURFACE);
      },
    }),
    client.addSlashCommand({
      name: "inbox",
      description:
        "Add this agent to the Inbox, or save text as a scratch note. Pass -w or --workspace to use this workspace's Inbox.",
      argumentHint: "[-w] [text]",
      context: "agent",
      async onSubmit({ args, agent, workspace, rpc }) {
        const command = parseInboxCommand(args);
        const workspaceId = command.workspace ? workspace.id : undefined;
        if (!command.text) {
          await rpc(starAgent, { agentId: agent.id, workspaceId });
        } else {
          await rpc(saveNote, { kind: "scratch", body: command.text, cwd: workspace.directory, workspaceId });
        }
        notifyItemsChanged();
      },
    }),
    contributeHeaderButtons(client),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
