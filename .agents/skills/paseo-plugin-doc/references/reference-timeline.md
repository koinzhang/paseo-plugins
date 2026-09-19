# Timeline items

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Timeline items

A plugin can replace an agent timeline entry with its own data and React Native renderer. Both
registrations are client contributions. Paseo applies the transformer while building the render
model, including every live streaming update.

```tsx
import type { PluginClientContext, PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Text } from "react-native";
import { z } from "zod";

const schema = z.object({ label: z.string() });

function Card({ item, theme }: PluginTimelineItemProps<z.output<typeof schema>>) {
  return <Text style={{ color: theme.colors.foreground }}>{item.data.label}</Text>;
}

export default function contribute(client: PluginClientContext) {
  client.addTimelineTransformer({
    id: "command-card",
    query: { itemType: "tool_call" },
    transform({ item, phase }) {
      return {
        items: [
          {
            type: "plugin",
            kind: "command-card",
            version: 1,
            data: { label: item.name, phase },
          },
        ],
      };
    },
  });
  client.addTimelineRenderer({
    kind: "command-card",
    version: 1,
    schema,
    Component: Card,
  });
  return () => {};
}
```

`query.itemType` is the stable, coarse selector. Inspect the selected item inside `transform` for
provider- or tool-specific recognition. Returning `undefined` keeps the original entry. Returning
`items` replaces it; an empty array removes it. Item `data` must be JSON-compatible. The `phase`
input is `"streaming"` for the live assistant message, running tool calls, and loading reasoning;
it is `"complete"` for committed or fetched messages and finished tools or reasoning.
Assistant and reasoning callbacks receive the full accumulated text on each update, including
paragraph separators. Paseo invokes transformers before splitting native Markdown or grouping
tools in Overview. A claimed assistant message remains one source item throughout streaming;
return `undefined` until recognizable if the first text is insufficient to identify it.
Each replacement may set an optional plugin-local `id`; otherwise Paseo uses its index within that
source item's output.

Renderers receive `agentId`, `item`, `timestamp`, `theme`, `host`, and `layout`. Paseo validates
`item.data` with the registered schema before rendering. Keep transformers synchronous and
deterministic. Paseo memoizes results by source-item reference and derives replacement identity from
the source row, so updates to one streaming item do not remount its renderer. Use the exported
`useRevealedText(text, phase)` hook when a renderer should pace streaming text like Paseo's built-in
assistant rows.

### Append a timeline row from the daemon

A server handler can add a plugin-owned row to canonical history:

```ts
import type { PluginHandlerContext } from "@getpaseo/plugin/server";

async function publishReview(agentId: string, { paseo }: PluginHandlerContext) {
  await paseo.agents.ref(agentId).timeline.append({
    type: "plugin",
    id: "review",
    kind: "review-result",
    version: 1,
    data: { verdict: "ready" },
  });
}
```

| Field     | Type             | Required | Behavior                                                       |
| --------- | ---------------- | -------- | -------------------------------------------------------------- |
| `type`    | `"plugin"`       | Yes      | Selects the plugin timeline variant.                           |
| `id`      | `string`         | Yes      | Stable plugin-local identity. Reusing it replaces the old row. |
| `kind`    | `string`         | Yes      | Selects the registered renderer.                               |
| `version` | positive integer | Yes      | Selects the renderer contract version.                         |
| `data`    | JSON-compatible  | Yes      | Renderer payload, at most 64 KiB after JSON serialization.     |

The daemon stamps `pluginId` from the calling plugin session and rejects this RPC from non-plugin
sessions. The row appears live, survives timeline refetches, and keeps only the latest value for the
same plugin and `id`. If its renderer is missing, Paseo shows the existing unavailable row. Daemons
reject `data` over the limit rather than truncating it. Daemons that support this operation
advertise `server_info.features.pluginTimelineItems`.
