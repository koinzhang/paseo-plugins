# Project files, runtime modules, and entry points

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Project files

`paseo plugin init /absolute/path/to/my-plugin` creates:

```text
my-plugin/
  paseo-plugin.json
  index.client.tsx
  index.server.ts
  client/greeting.tsx
  server/greeting.ts
  shared/greeting.ts
  package.json
  tsconfig.json
```

The required root manifest is `paseo-plugin.json`:

```json
{
  "id": "my-plugin",
  "description": "Reviews changes before merge",
  "requirements": { "paseo": ">=0.8.0" }
}
```

| Field          | Required | Behavior                                                               |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `id`           | Yes      | Default installation ID.                                               |
| `description`  | No       | Non-empty summary shown below the plugin ID in **Settings → Plugins**. |
| `requirements` | No       | Supported Paseo versions, described below.                             |
| `build`        | No       | Preparation commands, described in the CLI reference.                  |

### Requirements

`requirements` is an optional object. Its currently supported key, `paseo`, accepts an npm semver
range. An omitted `requirements.paseo` means `<0.8.0`: the plugin predates the first breaking
plugin release. Paseo 0.8 and later reject it with a link to the [migration guide](migration).
Empty strings, invalid ranges, and unknown manifest requirement keys are rejected.

| Range            | Compatible releases                                                          |
| ---------------- | ---------------------------------------------------------------------------- |
| `>=0.8.0`        | 0.8.0 and later releases, including prereleases and future breaking releases |
| `^0.8.0`         | 0.8.x releases, including prereleases                                        |
| `>=0.8.3 <0.9.0` | 0.8.3 through the last 0.8 patch, including prereleases                      |

Prerelease Paseo versions also satisfy a range their stable core (`major.minor.patch`) satisfies, so `0.8.0-beta.1` satisfies `>=0.8.0` but not `<0.8.0`.

`paseo plugin init` writes `>=` followed by the current CLI version and pins the matching SDK
for typechecking. Raise the minimum when adopting a newer API. Add an upper bound when a later
release is incompatible; a minimum alone does not promise protection from future breaking changes.

The daemon checks its version before installing, running preparation commands, or loading a plugin,
and checks again on startup, enable, and reload. A rejected update keeps the installed revision.
Each connected app checks its own version before evaluating client code and shows incompatibility
in Settings → Plugins. A compatible daemon does not make an older app compatible. A plugin with no
client entry does not require the connected app to match.

For example: `Plugin "review" requires Paseo >=0.8.0. Your daemon is 0.7.2.` Use a compatible plugin
revision or update the named runtime. Releases before 0.8 do not understand this manifest field
and cannot show this new diagnostic.

### Runtime entries

| Entry              | Runtime               | Receives              | Required                                                                        |
| ------------------ | --------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `index.client.tsx` | Paseo app, per client | `PluginClientContext` | When the plugin has any UI, callback, theme, or attachment source               |
| `index.server.ts`  | Daemon subprocess     | `PluginServerContext` | When the plugin contributes handlers, hooks, settings persistence, or providers |

At least one entry is required; both accept `.ts` or `.tsx`. A directory that still has only the
old `index.ts` fails to load and points at the [migration guide](/docs/plugins/migration).

Plugin, surface, sidebar-item, workspace-panel, Command Center item, attachment-source, and
slash-command IDs start with a lowercase letter and contain lowercase letters, numbers, or hyphens.

The generated `package.json` installs `@getpaseo/plugin` and the other host modules as development
dependencies for local typechecking and tests. Paseo supplies their runtime instances. Consumers do
not install them when adding the plugin.

Every other module lives in one of three directories. Nesting inside them is fine; a module at the
plugin root is a compile error.

| Directory | Compiled into      | Use it for                                                           |
| --------- | ------------------ | -------------------------------------------------------------------- |
| `client/` | App bundle only    | React, React Native, hooks, styles, surfaces, panels, and callbacks. |
| `server/` | Daemon bundle only | Node APIs, local resources, credentials, and RPC handlers.           |
| `shared/` | Both               | Zod RPC contracts and plain values imported by both runtimes.        |

## Runtime modules

Paseo builds each bundle from its matching entry. An import from `client/` into the daemon bundle,
from `server/` into the app bundle, or of a Node module anywhere in the app bundle is a compile
error. Server imports of React, React Native, or client SDK entries also fail. Shared code imports
only shared code: no Node, React, runtime-specific SDK entries, or runtime-specific types.

The SDK root (`@getpaseo/plugin`) contains shared data, schemas, and runtime-neutral helpers only.
Import client contexts and hooks from `/client`, server contexts and lifecycle contracts from
`/server`, and UI from `/client/react-native` or `/client/ui`. These rules include type imports and transitive
dependencies. `/client/host` is private to the app host; plugins cannot import it.

### Client runtime

Paseo provides these modules to client code:

| Module                                 | Use it for                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@getpaseo/plugin`                     | Shared data, `defineRpc`, `defineSettings`, `defineAttachmentSource`, `RpcInput`, and `RpcOutput` |
| `@getpaseo/plugin/client/ui`           | Named, composable settings components                                                             |
| `@getpaseo/plugin/client/react-native` | Paseo UI components and UI hooks                                                                  |
| `@getpaseo/plugin/client`              | Client contribution contexts, `usePaseo`, `useRpc`, `useSettings`, and data hooks                 |
| `@tanstack/react-query`                | Request state and caching                                                                         |
| `react`                                | Components and hooks                                                                              |
| `react/jsx-runtime`                    | Compiled JSX                                                                                      |
| `react-native`                         | Cross-platform UI                                                                                 |
| `zod`                                  | Shared schemas                                                                                    |

The host owns its paired React and renderer versions. The SDK's React peer range permits patch
versions for tooling and Node consumers; it does not change the app's pinned React version or
guarantee compatibility with another host's renderer.

These exact module specifiers use the host's runtime instances. A client bundle that requests another host module fails with `Module "<name>" is not available in plugin client code`.

Do not import `lucide-react-native`, `react-native-svg`, or DOM libraries. Set contribution `icon` fields to a [Lucide icon name](https://lucide.dev/icons/); Paseo validates the name and renders the icon.

### Cross-platform rules

Client code runs on iOS, Android, and in browsers through React Native Web. A component that works
in your browser and crashes on a phone is the most common plugin bug. The rules:

| Do                                                                         | Do not                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `View`, `Text`, `Pressable`, `ScrollView`, `TextInput` from `react-native` | `<div>`, `<span>`, `<button>`, or any HTML element                          |
| `style` objects built from `theme.colors` and `layout.compact`             | `className`, CSS strings, or hardcoded colors                               |
| `onPress`                                                                  | `onClick`, `onMouseEnter`, or other DOM handlers                            |
| `Linking`, `Clipboard`-style React Native APIs                             | `window`, `document`, `localStorage`, `navigator`, `location` in components |

The scaffold's `tsconfig.json` omits the DOM library. Keep DOM globals out of cross-platform
components; do not add `/// <reference lib="dom" />` or `"DOM"` to `lib`.
`layout.platform` carries the same value as React Native's `Platform.OS` for rendering decisions.

### External links and workspace browsers

Use `ExternalLink` to open documentation outside Paseo:

```tsx
import { ExternalLink } from "@getpaseo/plugin/client/ui";

export function DocumentationLink() {
  return <ExternalLink href="https://paseo.sh/docs">Open documentation</ExternalLink>;
}
```

The component has accessible link semantics and uses the same opener as
`openExternalUrl(url: string): Promise<void>`:

```ts
import { openExternalUrl } from "@getpaseo/plugin/client";

export async function openDocumentation() {
  await openExternalUrl("https://paseo.sh/docs");
}
```

Call the function directly from a user interaction so the browser permits a new tab.

| Platform      | External links                     | `navigation.openBrowser`                         |
| ------------- | ---------------------------------- | ------------------------------------------------ |
| Electron      | System browser                     | Available; creates a local workspace browser tab |
| Browser web   | New tab with `noopener,noreferrer` | `undefined`                                      |
| iOS / Android | OS URL handler                     | `undefined`                                      |

#### ExternalLink props

| Prop                            | Required | Behavior / default                                     |
| ------------------------------- | -------- | ------------------------------------------------------ |
| `href: string`                  | Yes      | Absolute HTTP(S) destination                           |
| `children: ReactNode`           | Yes      | Link text or inline React Native content               |
| `accessibilityLabel: string`    | No       | Overrides the accessible name derived from the content |
| `testID: string`                | No       | Test identifier; unset by default                      |
| `onError(error: unknown): void` | No       | Receives opening errors; defaults to logging them      |

#### Open a workspace browser

Use `navigation.openBrowser` from a surface or panel. Check availability before rendering
the action. This workspace panel chooses an external link on other platforms:

```tsx
import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { ExternalLink } from "@getpaseo/plugin/client/ui";
import { Pressable, Text } from "react-native";

export function DocumentationPanel({ navigation, workspaceId, theme }: PluginWorkspacePanelProps) {
  const openBrowser = navigation?.openBrowser;
  const url = "https://paseo.sh/docs";

  if (!openBrowser) {
    return <ExternalLink href={url}>Open documentation</ExternalLink>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => openBrowser({ url, workspaceId })}>
      <Text style={{ color: theme.colors.foreground }}>Open in workspace browser</Text>
    </Pressable>
  );
}
```

`navigation.openBrowser({ url, workspaceId, serverId? }): void` creates and focuses a new tab.
It never opens externally as an automatic fallback.

| Option                | Required | Behavior / default                                                |
| --------------------- | -------- | ----------------------------------------------------------------- |
| `url: string`         | Yes      | Absolute HTTP(S) destination                                      |
| `workspaceId: string` | Yes      | Workspace already present in the target host's app workspace list |
| `serverId: string`    | No       | Defaults to the surface or panel's selected host                  |

To target another host, pass its ID with that host's workspace ID:

```ts
openBrowser({ url, workspaceId: remoteWorkspaceId, serverId: remoteServerId });
```

`serverId` selects workspace ownership. The page runs on your local desktop, including
for remote workspaces; `localhost` URLs refer to that desktop.

#### Errors and refusal

| Condition                                                             | Result                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| External URL is malformed or uses a non-HTTP(S) scheme                | Ignored; `openExternalUrl` resolves without opening anything                   |
| OS opener fails                                                       | `openExternalUrl` rejects; `ExternalLink` calls `onError` or logs the error    |
| Browser blocks a new external tab                                     | Cannot be distinguished from a successful `noopener` open                      |
| In-app browser URL is malformed or uses a non-HTTP(S) scheme          | Throws `Only absolute HTTP(S) URLs are supported.` before creating a tab       |
| In-app browser workspace ID is empty                                  | Throws `workspaceId is required.` before creating a tab                        |
| Target host/workspace is unknown or its workspace list has not loaded | Throws `Workspace is unavailable on the requested host.` before creating a tab |

Use the [settings API](reference-theme.md#settings-screens) for typed host-scoped persistence across clients.
Use `openSettings`, `openSurface`, and `openPanel` for your own registered contributions.

### Server runtime

Paseo provides `@getpaseo/plugin`, `@getpaseo/plugin/server`,
`@getpaseo/plugin/server/provider`, `@getpaseo/plugin/server/acp`, and `zod` to server code. Backend
contributions run in a daemon subprocess with Node access to the host machine. Keep filesystem,
process, credential, and other machine-local work under `server/`. A plugin without
`index.server.ts` starts no subprocess.

### Providers

Follow [Build a provider plugin](providers.md) for direct and ACP implementations,
session lifecycle, composer settings, timeline renderers, testing, and distribution.

Call `server.registerProvider()` with a `ProviderRegistration` from
`@getpaseo/plugin/server/provider`. Its connection accepts inputs with `send()` and emits complete state
snapshots through `onEvent()`. `send()` reports acceptance only; prompt disposition, turns,
configuration, persistence, permissions, and failures are events.

Use the single `session.prompt` input for messages, structured commands, steering, and command side
effects. Repeat `clientMessageId` on the live user timeline item and publish exactly one matching
`session.prompt_result`. Publish provider-created children as sessions with `parentSessionId`.

Provider settings are toggle/select descriptors that Paseo renders in the composer. Keep
provider-private JSON under `providerOptions`. Host tools arrive as MCP servers in the complete
session config.

Paseo refreshes an agent by closing its current provider session and opening it with current
configuration and persistence. Providers re-read external state during `session.open`.

Use `runAcpProvider()` from `@getpaseo/plugin/server/acp` to adapt a command-backed ACP. Add transformer
hooks only for a vendor's discovery, configuration, notification, or tool-call differences.

`ProviderRegistration.icon` is a file path relative to the plugin directory, such as `icon.svg`.
It must resolve inside that directory to a regular SVG file no larger than 64 KiB. The SVG must be
self-contained: scripts, styles, `foreignObject`, event-handler attributes, JavaScript URLs, and
external `href` or `xlink:href` references are rejected. Fragment references such as `#mark` are
allowed. Paseo reads and sanitizes the file when the plugin starts; the string is never an inline
SVG or URL.

## Entry point and cleanup

Each present entry default-exports one contribution function and returns cleanup. Client entries
receive `PluginClientContext`; server entries receive `PluginServerContext`. Client registration methods return idempotent removers, except header buttons and composer pills,
which return `{ update, remove }` handles. The entry cleanup runs before Paseo removes remaining registrations.

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Main } from "./client/main";

export default function contribute(client: PluginClientContext) {
  client.addSurface("main", Main);
  return () => {};
}
```

Cleanup can be async. Release timers, watchers, sockets, and other resources created by the plugin. Paseo also removes registrations, unmounts surfaces, rejects pending RPCs, closes the plugin's daemon session, and stops its subprocess on reload, disable, removal, disconnect, or daemon shutdown.
