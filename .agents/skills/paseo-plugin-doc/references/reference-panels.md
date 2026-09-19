# Workspace panels

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Workspace panels

Register one panel for workspace or agent context:

`client/review.tsx`:

```tsx
import { type PluginAgentPanelProps, useAgent, useWorkspace } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { Text, View } from "react-native";

export function ReviewPanel({ theme, layout, workspaceId, agentId }: PluginAgentPanelProps) {
  const workspaceName = useWorkspace(workspaceId, (workspace) => workspace.name);
  const agent = useAgent(agentId, ({ id, title }) => ({ id, title }));
  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
      },
      title: { color: theme.colors.foreground },
      detail: { color: theme.colors.foregroundMuted },
    }),
    [theme, layout.compact],
  );
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{workspaceName}</Text>
      <Text style={styles.detail}>{agent?.title ?? agent?.id}</Text>
    </View>
  );
}
```

`index.client.tsx`:

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { ReviewPanel } from "./client/review";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "review",
    title: "Review",
    icon: "Scan",
    context: "agent",
    locations: ["workspace", "explorer"],
    Component: ReviewPanel,
  });
  return () => {};
}
```

`addWorkspacePanel` fields:

| Field       | Required | Meaning                                                       |
| ----------- | -------- | ------------------------------------------------------------- |
| `id`        | Yes      | Plugin-local panel ID.                                        |
| `title`     | Yes      | Workspace-tab title.                                          |
| `icon`      | Yes      | Lucide icon name.                                             |
| `context`   | Yes      | `workspace` or `agent`.                                       |
| `locations` | No       | `workspace` and/or `explorer`. Defaults to `workspace`.       |
| `Component` | Yes      | React Native component matching the selected context's props. |

A workspace panel receives `PluginWorkspacePanelProps`: `context: "workspace"`, `theme`, `host`, `layout`, and `workspaceId`. An agent panel receives `PluginAgentPanelProps`: `context: "agent"`, the same common fields and `workspaceId`, plus `agentId`.

Read cached state with `useWorkspace(workspaceId, selector)` and `useAgent(agentId, selector)`. A selector is required. Paseo compares its result shallowly, so selecting `{ name, status }` does not re-render when unrelated fields change. Select every field the component renders in one call; do not select the whole snapshot.

Both hooks return `null` when the record is unavailable. Otherwise they run synchronously against normalized client state. Snapshot DTOs and their nested values are deeply readonly and frozen at runtime. Do not call plugin RPC to discover the current workspace or agent. Fetch optional or vendor-specific enrichment after the component renders.

Workspace snapshot fields:

| Field                | Type                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `id`                 | `string`                                                          |
| `projectId`          | `string`                                                          |
| `projectDisplayName` | `string`                                                          |
| `projectRootPath`    | `string`                                                          |
| `directory`          | `string`                                                          |
| `projectKind`        | `"git" \| "non_git" \| "directory"`                               |
| `kind`               | `"directory" \| "local_checkout" \| "checkout" \| "worktree"`     |
| `name`               | `string`                                                          |
| `title`              | `string \| null`                                                  |
| `status`             | `"needs_input" \| "failed" \| "running" \| "attention" \| "done"` |
| `statusEnteredAt`    | ISO timestamp or `null`                                           |
| `archivingAt`        | ISO timestamp or `null`                                           |
| `diffStat`           | `{ additions: number; deletions: number } \| null`                |

Agent snapshot fields:

| Field               | Type                                                           |
| ------------------- | -------------------------------------------------------------- |
| `id`                | `string`                                                       |
| `workspaceId`       | `string`                                                       |
| `provider`          | `string`                                                       |
| `status`            | `"initializing" \| "idle" \| "running" \| "error" \| "closed"` |
| `createdAt`         | ISO timestamp                                                  |
| `updatedAt`         | ISO timestamp                                                  |
| `lastActivityAt`    | ISO timestamp                                                  |
| `title`             | `string \| null`                                               |
| `cwd`               | `string`                                                       |
| `model`             | `string \| null`                                               |
| `currentModeId`     | `string \| null`                                               |
| `thinkingOptionId`  | `string \| null`                                               |
| `requiresAttention` | `boolean`                                                      |
| `attentionReason`   | `"finished" \| "error" \| "permission" \| null`                |
| `parentAgentId`     | `string \| null`                                               |
| `labels`            | `Record<string, string>`                                       |

Paseo owns tab focus, splitting, closing, persistence, query state, the API/RPC providers, and the render error boundary. A restored tab whose plugin, panel, context, workspace, or agent is unavailable stays open with an unavailable message instead of crashing the workspace.
