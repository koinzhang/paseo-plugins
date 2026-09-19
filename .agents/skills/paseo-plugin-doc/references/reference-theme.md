# Theme, layout, themes, and settings screens

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Theme and layout

Plugin UI runs on desktop, browser, iOS, and Android, across every Paseo theme. `theme` is a typed `PluginTheme` mapped from the active host theme. Color and spacing must come from those props. Hardcoded colors and unstyled `Text` break when the host theme changes.

Recreate styles when `theme` or `layout.compact` changes.

| Key                             | Required for               | Use it for                          |
| ------------------------------- | -------------------------- | ----------------------------------- |
| `theme.colors.foreground`       | Every primary `Text`       | Titles and body copy                |
| `theme.colors.foregroundMuted`  | Secondary `Text`           | Labels and supporting copy          |
| `theme.colors.surface0`         | Root view                  | Panel background                    |
| `theme.colors.surface1`         | Raised surfaces            | Cards and panels                    |
| `theme.colors.surface2`         | Control surfaces           | Inputs and secondary controls       |
| `theme.colors.border`           | Surface boundaries         | Borders and dividers                |
| `theme.colors.accent`           | Primary action fills       | Buttons and selected states         |
| `theme.colors.accentForeground` | Text on an accent fill     | Button labels                       |
| `theme.colors.statusSuccess`    | Success feedback           | Success messages and indicators     |
| `theme.colors.statusWarning`    | Warning feedback           | Warning messages and indicators     |
| `theme.colors.statusDanger`     | Failure copy               | Error messages and destructive text |
| `layout.compact`                | Padding and stacking       | `true` on mobile and narrow windows |
| `layout.platform`               | Platform-specific behavior | `ios`, `android`, or `web`          |

Do not hardcode `#000`, `#fff`, or React Native's default text color. Primary copy uses `foreground`. Labels use `foregroundMuted`. Tighten padding when `layout.compact` is true.

Workspace and agent panels receive the same `theme`, `layout`, and optional `navigation` fields.

## Contribute a theme

`addTheme` adds a light or dark theme to Settings → Appearance, listed under the built-ins by its
`name`. A theme is data, so it needs no component file:

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";

export default function contribute(client: PluginClientContext) {
  client.addTheme({
    id: "mocha",
    name: "Catppuccin Mocha",
    appearance: "dark",
    colors: {
      background: "#1e1e2e",
      foreground: "#cdd6f4",
      raised: "#313244",
      control: "#45475a",
      border: "#45475a",
      accent: "#cba6f7",
      mutedForeground: "#a6adc8",
      ring: "#6c7086",
    },
  });
  return () => {};
}
```

Every color is a hex string; anything else fails to load. Paseo expands the palette into the full
token set the built-in dark themes use, so a contributed theme covers panels, menus, diffs, status
colors, and the terminal without listing them.

| Color             | Becomes                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `background`      | App, workspace, and terminal background                           |
| `foreground`      | Primary text, terminal foreground and cursor                      |
| `raised`          | Cards, popovers, and hovered rows                                 |
| `control`         | Inputs, secondary fills, and the light-theme sidebar              |
| `border`          | Borders and the highest raised-surface tint                       |
| `accent`          | Buttons, selection, and focus. Optional; `foreground` if omitted. |
| `mutedForeground` | Secondary text                                                    |
| `ring`            | Focus rings, scrollbars, and terminal bright black                |

`appearance` is `"light"` or `"dark"`. Paseo uses it to select the matching surface, status,
diff, syntax, terminal, and shadow derivation.

Only one contributed theme is active at a time. Selecting one persists the choice; if the plugin is
later disabled or removed, Paseo falls back to the default theme rather than leaving the app
unpainted.

Themes need a host that supports them. A client released before `addTheme` cannot evaluate that client entry and reports
`client.addTheme is not a function`. Update the client.

## Settings screens

Register a component with `client.addSettingsScreen({ id, title, icon, Component })` in
`index.client.tsx`. It appears under **Settings → Plugins → your plugin** on that host.
`id` is unique within the installation; `icon` is a Lucide name. Registration returns an
idempotent remover, and plugin teardown removes remaining screens.

Call `client.openSettings(id)` or a Command Center callback's `openSettings(id)` to open one
of your own screens. Each installation has its own values and route, even when several hosts
install the same plugin.

The component receives `PluginSurfaceProps`. Paseo owns the header, back navigation, safe areas,
scrolling, and the centered settings column. Compact windows push a full-screen detail; wide
windows keep the settings sidebar. Render content inside that frame using React Native components.
A disabled or removed plugin leaves an unavailable screen with working Back navigation.

### Named UI components

Import settings components from `@getpaseo/plugin/client/ui`. They work with your own state and RPCs;
no form wrapper or storage binding is required.

```tsx
import { useState } from "react";
import { SettingsCard, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";

export function DisplaySettings() {
  const [visible, setVisible] = useState(true);
  return (
    <SettingsSection title="Display">
      <SettingsCard>
        <SettingsSwitch label="Show metadata" value={visible} onValueChange={setVisible} />
      </SettingsCard>
    </SettingsSection>
  );
}
```

| Component                          | Props and behavior                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SettingsGroup`, `SettingsSection` | Required `title`, `children`; optional `info` tooltip, `trailing` content, `testID`. Own section spacing and headings.                   |
| `SettingsCard`                     | `children`, optional `testID`. Owns the card surface and dividers between direct children. Give mapped rows stable React keys.           |
| `SettingsRow`                      | Required `label`; optional `hint`, `error`, `children`, `testID`. Wrap any custom control or content.                                    |
| `SettingsSwitch`                   | Row props plus required `value: boolean`, `onValueChange`; optional `disabled`.                                                          |
| `SettingsSelect`                   | Row props plus required string `value`, `options: { label, value }[]`, `onValueChange`; optional `disabled`. Uses Paseo's adaptive menu. |
| `SettingsInput`                    | Row props plus required `onChangeText`; optional `initialValue`, `placeholder`, `disabled`, `secureTextEntry`, `ref`.                    |
| `SettingsAction`                   | Row props plus required `actionLabel`, `onPress`; optional `disabled`.                                                                   |

`SettingsInput` owns in-progress text. `initialValue` seeds it when mounted. Its ref exposes
`focus()`, `blur()`, `getText()`, and `replaceText(text)` for explicit programmatic changes.
Keep draft text outside persisted values until the user saves. Custom previews and controls
can sit beside or inside these components.

### Persisted values

Define a settings document in `shared/`:

```ts
import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "display",
  scope: "host",
  version: 1,
  schema: z.object({ showMetadata: z.boolean().default(true) }),
});
```

Register it in `index.server.ts` before returning cleanup. The returned handle lets server code
read the document and react to changes. A screen using its own data can remain client-only.

```ts
export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);

  settings.subscribe((next) => {
    if (next.status === "ready") {
      console.log("Settings changed", next.revision);
    }
  });

  return () => {};
}
```

| Definition field               | Contract                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                           | Lowercase identifier matching `[a-z][a-z0-9_-]*`; unique within the installation.                                                    |
| `scope`                        | Required `"host"`. All authorized clients of that host share the document. No per-user, device-local, or cross-host synchronization. |
| `version`                      | Required positive integer describing the schema, independent of the write revision.                                                  |
| `schema`                       | Zod schema for JSON values. Supply defaults so parsing `{}` produces a complete document.                                            |
| `migrate(values, fromVersion)` | Optional synchronous or asynchronous conversion from an older stored version. Its output must pass the current schema.               |

Call `useSettings(preferences)` in any contributed component. It returns a discriminated state:

| `status`  | Available data                                                           |
| --------- | ------------------------------------------------------------------------ |
| `loading` | Read is pending; do not render default values as though they were saved. |
| `ready`   | Typed `values` and an opaque `revision`.                                 |
| `invalid` | `error` and `revision`; stored data is preserved.                        |
| `error`   | `error` from the read/connection.                                        |

The server handle exposes `read()` and `subscribe()`. `read()` returns the same `ready` or
`invalid` state as the client hook, including the opaque revision. `subscribe()` returns a cleanup
function and receives a new `ready` state after a successful save, reset, or migration. Invalid
writes and revision conflicts do not notify subscribers. Listener failures are logged without
turning a committed write into a failed save.

```ts
const current = await settings.read();
if (current.status === "ready") {
  // Use current.values and current.revision.
}
```

Every state also exposes `saving`, `saveError`, and these actions:

- `save(values, revision): Promise<boolean>` validates and saves a complete document. Returns
  `false` and sets `saveError` on validation, conflict, or transport failure; it does not throw.
- `reset(): Promise<boolean>` explicitly replaces the document with schema defaults, using the
  revision loaded by the hook. It can recover invalid stored data.
- `reload(): Promise<void>` clears the save error and reads again. Your component owns its draft;
  reloading does not discard that draft automatically.

For an immediate toggle, pass `{ ...settings.values, showMetadata }` and `settings.revision`
to `save`. For a draft editor, capture both the values and revision when opening it. Keep that
revision until a save succeeds or the user discards the draft. A stale revision rejects the
save, preserving both the draft and the newer saved values.

Writes are atomic and validated on the host. Connected clients receive updates without reloading
the plugin. Values survive daemon restart, plugin reload, disable, and updates. Removing an
installation deletes its settings. Reinstalling that ID starts from defaults.

A missing document uses schema defaults. Invalid data, failed migrations, and unsupported newer
versions produce `invalid` without silently resetting the file. Successful migrations persist
the new version once. These documents are ordinary host-side JSON, not a credential vault.
Settings RPCs use the existing `daemon.manage` permission for plugin execution.

See the complete [settings example](https://github.com/getpaseo/paseo/tree/main/plugin-examples/settings)
for immediate controls, a draft editor with validation, custom content, and Command Center navigation.
