# Command Center, slash commands, header buttons, composer pills

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Command Center items

Open the Command Center with **⌘K** on macOS or **Ctrl+K** on Windows and Linux, then search for the item title.

Register an action and open a panel from the callback:

```tsx
import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const refreshReview = defineRpc({
  name: "review.refresh",
  input: z.object({ agentId: z.string(), scope: z.string().optional() }),
  output: z.object({ refreshed: z.boolean() }),
});

client.addCommandCenterItem({
  id: "open-review",
  title: "Open review",
  icon: "Scan",
  keywords: ["inspect"],
  context: "agent",
  async onSelect({ paseo, rpc, workspace, agent, openPanel }) {
    await paseo.workspaces.ref(workspace.id).setTitle(`Review ${agent.id}`);
    await rpc(refreshReview, { agentId: agent.id });
    openPanel("review");
  },
});
```

`addCommandCenterItem` fields:

| Field      | Required | Meaning                                        |
| ---------- | -------- | ---------------------------------------------- |
| `id`       | Yes      | Plugin-local item ID.                          |
| `title`    | Yes      | Search result title.                           |
| `icon`     | Yes      | Lucide icon name.                              |
| `keywords` | No       | Additional Command Center search terms.        |
| `context`  | Yes      | `global`, `workspace`, or `agent`.             |
| `onSelect` | Yes      | Client-side callback for the matching context. |

Global items appear on the installation's selected host. Workspace items appear only when that host has an active cached workspace. Agent items appear only when the focused workspace tab is an agent or an agent-context plugin panel whose cached record belongs to that workspace. Missing context removes the item rather than calling the plugin to discover it.

Every callback receives:

| Field                     | Context             | Meaning                                                                                                         |
| ------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `context`                 | All                 | Matching discriminator.                                                                                         |
| `paseo`                   | All                 | Selected host's existing `PaseoApi`.                                                                            |
| `rpc(contract, input)`    | All                 | Typed call to this installation's daemon-side plugin handler.                                                   |
| `openSurface(id)`         | All                 | Opens one of this plugin's registered global surfaces.                                                          |
| `workspace`               | Workspace and agent | Synchronous workspace snapshot.                                                                                 |
| `agent`                   | Agent               | Synchronous matching agent snapshot.                                                                            |
| `openPanel(id, options?)` | Workspace and agent | Opens a registered panel in the callback's current context. Pass `{ location: "explorer" }` to target Explorer. |

An agent callback may open either an agent panel or a workspace panel. A workspace callback may open only a workspace panel. Unknown surface and panel IDs fail visibly. Use `paseo` for normal workspace, agent, provider, and daemon-config operations. Use `rpc` for plugin-specific filesystem, credential, vendor, or daemon-local work.

## Slash commands

Register a command that runs in the Paseo client when the user submits `/name args` from the
message composer. The text is never sent to the agent:

```ts
client.addSlashCommand({
  name: "review",
  description: "Run the review bot",
  argumentHint: "[scope]",
  context: "agent",
  async onSubmit({ args, agent, rpc, openPanel }) {
    await rpc(refreshReview, { agentId: agent.id, scope: args });
    openPanel("review");
  },
});
```

| Field          | Required | Meaning                                        |
| -------------- | -------- | ---------------------------------------------- |
| `name`         | Yes      | Command name without the leading slash.        |
| `description`  | Yes      | Composer autocomplete description.             |
| `argumentHint` | Yes      | Short usage hint shown after the command name. |
| `context`      | Yes      | `"workspace"` or `"agent"`.                    |
| `onSubmit`     | Yes      | Client callback for the matching context.      |

`onSubmit` receives the matching Command Center callback context plus `args`. For `/review src`,
`args` is `"src"`; Paseo trims only the remainder's leading and trailing whitespace and leaves
parsing to the plugin. Paseo owns the autocomplete row, input clearing, and the error toast. It
does not wait for `onSubmit` or show a pending state; use a composer pill or panel for that.

Precedence is built-in client commands, plugin commands, then provider commands. A lower-precedence
collision is omitted. Built-in aliases also reserve their names. The first plugin in stable catalog
order wins a collision between plugins. Commands do not run while the composer has attachments.

## Header buttons

Try the [button example](https://github.com/getpaseo/paseo/tree/main/plugin-examples/buttons) for
actions, menus, custom icons and content, and visibility updates in both the header and composer.
It switches one header button between modes; additional actions use a named Tools menu.

`client.addHeaderButton({ id, workspaceId, button })` adds a button before the built-in actions on
the workspace header's right side. It returns a registration with `update(patch)` and `remove()`.

```tsx
const review = client.addHeaderButton({
  id: "review",
  workspaceId,
  button: {
    title: "Open review",
    icon: "Scan",
    label: "Review",
    behavior: {
      kind: "action",
      onPress() {
        client.openPanel("review", { workspaceId });
      },
    },
  },
});

review.update({ label: "Review · 3" });
review.update({ visible: false });
review.update({ visible: true });
review.remove();
```

Omit `label` for an icon-only header button. Menus and popovers show a chevron on wide layouts.
Compact header buttons use icons without labels or chevrons. Paseo moves excess contributions
into a shared overflow menu. Placement and overflow are host decisions.

## Composer pills

`client.addComposerPill({ id, workspaceId, agentId, button })` uses the same [button descriptor](#button-descriptor)
and returns the same registration. It targets one agent's composer track alongside Tasks and
Subagents. Composer pills always show the icon and `label` (or `title` when `label` is omitted).
They never show a chevron, including for menus and popovers.

```tsx
const pill = client.addComposerPill({
  id: "review",
  workspaceId,
  agentId,
  button: {
    title: "Open review",
    icon: "Scan",
    label: "Review",
    behavior: {
      kind: "action",
      onPress() {
        client.openPanel("review", { workspaceId, agentId });
      },
    },
  },
});
```

For pills that follow the agent directory, use an explicit [owned list subscription](/docs/sdk/events#follow-one-agents-status).
The [local plugin example](https://github.com/getpaseo/paseo/blob/main/plugin-examples/local-plugin/client/main.tsx)
replaces registrations on each snapshot and aborts the observation during entry cleanup, including pending bootstrap.

## Button descriptor

These contracts are exported from `@getpaseo/plugin/client`.

| Field      | Required | Meaning                                                                 |
| ---------- | -------- | ----------------------------------------------------------------------- |
| `title`    | Yes      | Non-empty accessible label, tooltip, and sheet title.                   |
| `icon`     | Yes      | Lucide name or `ComponentType<PluginButtonIconProps>`.                  |
| `label`    | No       | Non-empty display text. Omit to use the placement's default.            |
| `visible`  | No       | Defaults to `true`. False removes the trigger and its layout space.     |
| `disabled` | No       | Defaults to `false`. Keeps the button visible and prevents interaction. |
| `behavior` | Yes      | One of the three shapes below.                                          |

```tsx
type PluginButtonBehavior =
  | { kind: "action"; onPress(): void | Promise<void> }
  | { kind: "menu"; items: readonly PluginButtonMenuEntry[] }
  | { kind: "popover"; Content: React.ComponentType<PluginButtonContentProps> };
```

An action runs on the client. Paseo marks the button busy until its promise settles, blocks repeated
presses, and shows failures in a toast. A failed action can be retried. Use the client's `paseo` for
ordinary operations and `rpc` for plugin-specific backend work.

Menus and popovers open anchored surfaces on wide layouts and bottom sheets on compact layouts.
The whole trigger opens the surface; there is no split-button behavior.

### Menu entries

A menu contains items and separators. IDs use lowercase letters, digits, and hyphens, start with
a letter, and are unique within that menu.

```tsx
const behavior: PluginButtonBehavior = {
  kind: "menu",
  items: [
    {
      kind: "item",
      id: "refresh",
      title: "Refresh review",
      icon: "RefreshCw",
      behavior: { kind: "action", onPress: refreshReview },
    },
    { kind: "separator", id: "details-divider" },
    {
      kind: "item",
      id: "details",
      title: "Review details",
      behavior: { kind: "popover", Content: ReviewDetails },
    },
  ],
};
```

An item requires `kind: "item"`, `id`, `title`, and `behavior`. Its optional `icon`, `visible`, and
`disabled` follow the button rules. A separator contains only `kind: "separator"` and `id`.
Paseo removes leading, trailing, and consecutive separators after filtering hidden items.

Items can use all three behaviors. Nested menus open flyouts on wide layouts and pages with back
navigation within the same compact sheet. Custom content pages open on selection, never hover.
Choosing an action closes the menu; opening another page keeps it open.

### Custom icons and popover content

`PluginButtonIconProps` contains `theme`, `host`, `layout`, `size`, `color`, and the target context.
Render a React Native icon or indicator within the supplied size. Paseo bounds the icon slot and
owns all pointer interaction. The icon component can use plugin hooks.

`PluginButtonContentProps` contains `theme`, `host`, `layout`, the target context, and `close()`.
Render the body only; Paseo owns anchoring, scrolling, padding, and sheet presentation. Content can
use `usePaseo`, `useRpc`, `useWorkspace`, `useAgent`, and the installation's React Query cache.

The target context is one of:

```ts
{ context: "workspace", workspaceId: string } // Header button
{ context: "agent", workspaceId: string, agentId: string } // Composer pill
```

### Updates and lifecycle

Each registration belongs to one plugin installation, placement, workspace, and (for pills) agent.
`id` is plugin-local within that target and uses the same format as menu IDs. The same ID may be
used in different targets or placements. Duplicate registration in the same target throws.

`update(patch: Partial<PluginButton>)` changes the descriptor in place, preserving identity and
order. When changing `behavior`, supply the complete new behavior object. Invalid updates throw
without changing the existing button. Subscribe to your own model or the client API and call
`update` to publish reactive changes; mutating the original descriptor does not update the UI.

Hiding or disabling a button closes its surface. Updating its behavior also closes the surface.
Hiding preserves the registration, so showing it again restores its position. It does not cancel
an action already in progress.

`remove()` is idempotent. Updates after removal do nothing. Paseo removes outstanding buttons when
the plugin installation or host connection is torn down. Return cleanup from the client entry for
your subscriptions, timers, and other resources.
