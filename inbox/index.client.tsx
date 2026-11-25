import type { PluginClientContext } from "@getpaseo/plugin/client";
import { watchInboxChanges } from "./client/changes.ts";
import { contributeHeaderButtons } from "./client/header-button.ts";
import { InboxSurface } from "./client/inbox-surface.tsx";
import { INBOX_SCREEN_ID } from "./client/screen-id.ts";
import { InboxSidebarItem } from "./client/sidebar-item.tsx";
import { notifyItemsChanged, requestDraft, requestSelection } from "./client/selection.ts";
import { WorkspaceInboxPanel } from "./client/workspace-panel.tsx";
import { saveNote, starAgent } from "./shared/contracts.ts";
import { parseInboxCommand } from "./shared/slash-command.ts";
import { itemsChanged } from "./shared/changes.ts";

export default function contribute(client: PluginClientContext) {
  const removers = [
    client.addScreen({ id: INBOX_SCREEN_ID, title: "Inbox", Component: InboxSurface }),
    client.addSidebarHeaderItem({
      id: INBOX_SCREEN_ID,
      title: "Inbox",
      Component: InboxSidebarItem,
    }),
    client.addWorkspacePanel({
      id: "workspace-inbox",
      title: "Inbox",
      icon: "Inbox",
      locations: ["explorer"],
      Component: WorkspaceInboxPanel,
    }),
    client.addCommandCenterItem({
      id: "open",
      title: "Inbox",
      icon: "Inbox",
      keywords: ["open"],
      context: "global",
      onSelect: ({ openScreen }) => openScreen({ screenId: INBOX_SCREEN_ID }),
    }),
    client.addCommandCenterItem({
      id: "star-agent",
      title: "Add agent to Inbox",
      icon: "Star",
      keywords: ["star", "favorite", "bookmark", "inbox"],
      context: "agent",
      async onSelect({ agent, rpc, openScreen }) {
        const { item } = await rpc(starAgent, { agentId: agent.id });
        requestSelection(item.id);
        openScreen({ screenId: INBOX_SCREEN_ID });
      },
    }),
    client.addCommandCenterItem({
      id: "quick-note",
      title: "New Inbox note",
      icon: "NotebookPen",
      keywords: ["note", "inbox", "capture"],
      context: "workspace",
      onSelect({ workspace, openScreen }) {
        requestDraft({ projectOfWorkspace: workspace.id });
        openScreen({ screenId: INBOX_SCREEN_ID });
      },
    }),
    client.addSlashCommand({
      name: "inbox",
      description: "Add this agent to the Inbox, or save text as a scratch note tagged with this project.",
      argumentHint: "[text]",
      context: "agent",
      async onSubmit({ args, agent, workspace, rpc }) {
        const command = parseInboxCommand(args);
        if (!command.text) {
          await rpc(starAgent, { agentId: agent.id });
        } else {
          await rpc(saveNote, { kind: "scratch", body: command.text, projectOfWorkspace: workspace.id });
        }
        notifyItemsChanged();
      },
    }),
    contributeHeaderButtons(client),
    watchInboxChanges(
      (onEvent, onClosed) => client.subscribe(itemsChanged, {}, onEvent, {
        onClosed: ({ error }) => onClosed(error),
      }),
      notifyItemsChanged,
    ),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}
