# Paseo SDK, plugin RPCs, logging, attachment sources

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Use the Paseo SDK

Use `usePaseo()` for ordinary Paseo operations from a surface. It borrows the selected host's existing connection; do not create another client.

```tsx
import { type PluginSurfaceProps, usePaseo } from "@getpaseo/plugin/client";
import { Pressable, Text } from "react-native";

function PullRequestAction({ theme }: PluginSurfaceProps) {
  const paseo = usePaseo();

  async function createReviewWorkspace() {
    const workspace = await paseo.workspaces.create({
      title: "Review PR 42",
      source: {
        kind: "worktree",
        cwd: "/absolute/path/to/repository",
        action: "checkout",
        checkoutSource: { kind: "change_request", forge: "github", number: 42 },
      },
    });
    await workspace.agents.create({
      config: { provider: "codex/gpt-5.5" },
      prompt: "Review PR #42.",
    });
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => void createReviewWorkspace()}>
      <Text style={{ color: theme.colors.foreground }}>Create review workspace</Text>
    </Pressable>
  );
}
```

The returned API covers projects, workspaces, agents, terminals, providers, and daemon config. See the [SDK API reference](/docs/sdk/reference) for its methods. Connection lifecycle methods are intentionally absent because Paseo owns the connection.

### Discover hosts and target another host

Use `useHosts()` to display configured hosts and `getPaseoClient(serverId)` in an action callback
to run SDK operations on one of them:

```tsx
import { getPaseoClient, useHosts, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useMemo, useState, type ReactElement } from "react";
import { Pressable, Text, View } from "react-native";

export function HostAgents({ theme }: Pick<PluginSurfaceProps, "theme">): ReactElement {
  const hosts = useHosts();
  const textStyle = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  const [result, setResult] = useState("");

  async function listAgents(serverId: string): Promise<void> {
    try {
      const { entries } = await getPaseoClient(serverId).agents.list();
      setResult(`${entries.length} agents`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    }
  }

  const rows = hosts.map((host) => ({
    host,
    onPress() {
      void listAgents(host.serverId);
    },
  }));

  return (
    <View>
      {rows.map(({ host, onPress }) => (
        <Pressable key={host.serverId} accessibilityRole="button" onPress={onPress}>
          <Text style={textStyle}>
            {host.label}: {host.status}
          </Text>
        </Pressable>
      ))}
      <Text style={textStyle}>{result}</Text>
    </View>
  );
}
```

`useHosts(): readonly PluginHostSummary[]` includes offline hosts and updates when hosts,
labels, or statuses change.

| Summary field | Type or values                                               | Meaning                                                      |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `serverId`    | `string`                                                     | ID to pass to `getPaseoClient`.                              |
| `label`       | `string`                                                     | Host's display name.                                         |
| `status`      | `"idle"`, `"connecting"`, `"online"`, `"offline"`, `"error"` | Current app connection status. SDK calls require `"online"`. |

`getPaseoClient(serverId: string): PaseoApi` borrows the host's authenticated app connection.
Call it in client entry code or callbacks; it opens no socket and does not require the plugin
on the target daemon. Acquire the API when performing an action to use the current connection.

| Event or condition                                                                       | Result and caller action                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown host ID                                                                          | Throws `Unknown Paseo host: <id>`; never falls through to another host.                                                                                         |
| Host is not online                                                                       | Throws `Paseo host is disconnected: <id>`, including calls through a retained API. Retry when online.                                                           |
| Same connection reconnects                                                               | Retained APIs remain usable after reconnection; observations resume automatically.                                                                              |
| Connection settings change or the app switches connections, including automatic failover | The old API is released. Call `getPaseoClient(serverId)` again and recreate subscriptions.                                                                      |
| Host is removed                                                                          | Its API is released; the removed ID is unknown.                                                                                                                 |
| `client.dispose()`                                                                       | Releases that API and its observations. A later getter call returns a fresh API over the app connection. Disposing the old API again leaves the new API usable. |
| Originating plugin unloads                                                               | All its borrowed APIs and observations are released, including those targeting other hosts. Retained handles cannot outlive the installation.                   |
| Surface host selection changes                                                           | `usePaseo()` follows the selected host. An explicitly acquired API keeps its original target.                                                                   |

You can also release individual subscriptions through the normal SDK API.

Plugins are trusted app code; cross-host access is intentional. Summaries contain no connection
URLs or credentials, and borrowed APIs provide no connection lifecycle controls. See the
[host agents example](https://github.com/getpaseo/paseo/tree/main/plugin-examples/hosts).

## Add plugin-specific backend behavior

Use plugin RPC only for work that is not a normal Paseo operation: reading a vendor API, accessing daemon-local resources, or keeping credentials off the client.

Define one contract with Zod, handle it in the subprocess, and call it from the surface:

`shared/greeting.ts`:

```ts
import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const greeting = defineRpc({
  name: "greeting.create",
  input: z.object({ name: z.string() }),
  output: z.object({ message: z.string() }),
});
```

`client/greeting.tsx`:

```tsx
import { useRpc } from "@getpaseo/plugin/client";
import { greeting } from "../shared/greeting";

export function GreetingButton() {
  const createGreeting = useRpc(greeting);
  // Call createGreeting({ name: "Ada" }) from an event or query.
  return null;
}
```

`server/greeting.ts`:

```ts
import type { RpcInput } from "@getpaseo/plugin";
import { greeting } from "../shared/greeting";

export function createGreeting({ name }: RpcInput<typeof greeting>) {
  return { message: `Hello, ${name}` };
}
```

`index.client.tsx`:

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GreetingButton } from "./client/greeting";

export default function contribute(client: PluginClientContext) {
  client.addSurface("main", GreetingButton);
  return () => {};
}
```

`index.server.ts`:

```ts
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { createGreeting } from "./server/greeting";
import { greeting } from "./shared/greeting";

export default function contribute(server: PluginServerContext) {
  server.handle(greeting, createGreeting);
  return () => {};
}
```

Inputs and outputs are validated on both sides. RPC names start with a lowercase letter and contain lowercase letters, numbers, dots, hyphens, or underscores. `useRpc()` returns a typed async function. Use TanStack Query for request state, caching, and mutations.

Backend handlers receive the same `PaseoApi` as `{ paseo }`. Their connection belongs to the subprocess and closes when the plugin stops. It does not subscribe to timelines or catalog events until plugin code subscribes. Follow the [SDK event contract](../../sdk/events.md) for cleanup and timeline replacements. Backend code can use Node APIs and dependencies installed in the plugin directory.

## Debug backend output

Backend contributions can write to stdout and stderr with normal Node logging:

```ts
console.log("Refreshing issues");
console.error("Issue refresh failed", error);
```

Paseo adds `[paseo]` entries when the plugin starts loading, becomes ready, starts stopping, and has
stopped. It records compilation and load failures as stderr entries, including failures that happen
before the plugin subprocess starts. Paseo also captures output emitted during initialization, RPC
handlers, cleanup, and process failure. Protocol traffic uses a separate channel, so `console.log()`
cannot corrupt plugin RPCs.

Open **Settings → Plugins → Logs** for the plugin, or inspect the same recent tail from the daemon
CLI:

```bash
paseo plugin logs my-plugin
paseo plugin logs my-plugin --json
paseo --host <url> plugin logs my-plugin
```

The command returns a snapshot rather than following live output. Refresh the settings view or run
the command again for newer entries. Each entry includes its timestamp, stdout or stderr stream,
sequence, and message.

Paseo retains up to 500 entries and 256 KiB per plugin in memory. Individual lines are capped at
16 KiB. Reload, disable, compilation failure, initialization failure, and process failure retain the
tail. Removing the plugin clears it, and a daemon restart starts a new tail. Structured copies are
also written to the daemon log at `$PASEO_HOME/daemon.log`.

Only daemon-side output is captured. Logs from client surfaces remain in the app runtime. Do not log
credentials, access tokens, or other secrets: connected users can read the retained tail, and the
daemon log persists it.

## Add a composer attachment source

An attachment source searches external resources and returns a stable text snapshot for an agent prompt. Keep credentials and vendor calls in the backend handler.

`shared/issues.ts`:

```ts
import { defineAttachmentSource, defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const searchIssues = defineRpc({
  name: "issues.search",
  input: z.object({ query: z.string() }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        url: z.string().url(),
        text: z.string(),
        resourceType: z.string(),
      }),
    ),
  }),
});

export const issues = defineAttachmentSource({
  id: "issues",
  title: "Acme issue",
  icon: "CircleDot",
  pickerTitle: "Attach Acme issue",
  searchPlaceholder: "Search by identifier or title",
  search: searchIssues,
});
```

`server/issues.ts`:

```ts
import type { RpcInput } from "@getpaseo/plugin";
import { searchIssues } from "../shared/issues";

export function search({ query }: RpcInput<typeof searchIssues>) {
  return searchAcmeIssues(query);
}
```

`index.client.tsx`:

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { issues } from "./shared/issues";

export default function contribute(client: PluginClientContext) {
  client.addAttachmentSource(issues);
  return () => {};
}
```

`index.server.ts`:

```ts
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { search } from "./server/issues";
import { searchIssues } from "./shared/issues";

export default function contribute(server: PluginServerContext) {
  server.handle(searchIssues, search);
  return () => {};
}
```

Paseo owns the composer menu, search picker, selected pill, draft state, and submission. The `text` value is the complete snapshot sent to the agent.
