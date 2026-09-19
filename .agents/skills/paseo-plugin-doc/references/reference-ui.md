# Surfaces, sidebar items, and Host UI

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Surfaces and sidebar items

Register a component, then point a sidebar item at its surface ID:

`client/main.tsx`:

```tsx
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { Text, View } from "react-native";

export function Main({ theme, host, layout }: PluginSurfaceProps) {
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
      <Text style={styles.title}>{host.label}</Text>
      <Text style={styles.detail}>{layout.platform}</Text>
    </View>
  );
}
```

`index.client.tsx`:

```ts
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Main } from "./client/main";

export default function contribute(client: PluginClientContext) {
  client.addSurface("main", Main);
  client.addSidebarItem({
    id: "main",
    title: "My plugin",
    icon: "Blocks",
    surface: "main",
  });
  return () => {};
}
```

`PluginSurfaceProps` contains:

| Field        | Meaning                                                                                                                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`      | Typed `PluginTheme` color tokens for the active Paseo theme.                                                                                                                                                                                                                                                                      |
| `host`       | Selected host `id` and display `label`.                                                                                                                                                                                                                                                                                           |
| `layout`     | `compact` and the `ios`, `android`, or `web` platform.                                                                                                                                                                                                                                                                            |
| `navigation` | Optional client navigation. `openAgent({ agentId, serverId? })` and `openWorkspace({ workspaceId, serverId? })` open targets on `serverId`, or on the selected host when omitted. `openBrowser({ url, workspaceId, serverId? })` is available only on Electron; see [links and browsers](#external-links-and-workspace-browsers). |

Paseo owns the route, header, close action, host picker, error boundary, and query client. The plugin owns the surface body.

## Host UI

Import Paseo-owned UI from `@getpaseo/plugin/client/react-native` in client code. This example
opens a controlled modal, renders a host icon, and confirms the action with a toast:

```tsx
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { Icon, Modal, useToast } from "@getpaseo/plugin/client/react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function IssueActions({ theme }: PluginSurfaceProps) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  function saveIssue() {
    toast.show("Issue saved", { variant: "success" });
    setOpen(false);
  }

  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="Pencil" size={18} color={theme.colors.foreground} />
          <Text style={{ color: theme.colors.foreground }}>Edit issue</Text>
        </View>
      </Pressable>

      <Modal
        title="Edit issue"
        icon={<Icon name="Pencil" size={18} color={theme.colors.foreground} />}
        open={open}
        onOpenChange={setOpen}
      >
        <Modal.Content>
          <Pressable accessibilityRole="button" onPress={saveIssue}>
            <Text style={{ color: theme.colors.foreground }}>Save</Text>
          </Pressable>
        </Modal.Content>
      </Modal>
    </View>
  );
}
```

### Modal

`Modal` uses a bottom sheet on compact layouts and a centered dialog otherwise. The plugin owns
the `open` state.

| Prop           | Type                      | Required | Behavior                                     |
| -------------- | ------------------------- | -------- | -------------------------------------------- |
| `title`        | `string`                  | Yes      | Labels the modal and its visible header.     |
| `icon`         | `ReactNode`               | No       | Renders before the title in the header.      |
| `open`         | `boolean`                 | Yes      | Shows the modal content when `true`.         |
| `onOpenChange` | `(open: boolean) => void` | Yes      | Receives `false` when the user dismisses it. |
| `children`     | `ReactNode`               | Yes      | Contains `Modal.Content`.                    |

`Modal.Content` owns the body below the host-rendered header:

| Prop                    | Type                   | Default            | Behavior                                                                          |
| ----------------------- | ---------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `children`              | `ReactNode`            | Required           | Body content below the header.                                                    |
| `style`                 | `StyleProp<ViewStyle>` | —                  | Styles the full body viewport, including empty space. Use for backgrounds.        |
| `contentContainerStyle` | `StyleProp<ViewStyle>` | Padding 24, gap 16 | Overrides the content layout. Set `padding: 0, gap: 0` for edge-to-edge rows.     |
| `scrollable`            | `boolean`              | `true`             | The host scrolls the body. Set `false` for a bounded body with your own scroller. |

A plain `Modal.Content` is already padded and scrollable. Avoid adding a second padded wrapper
unless you want another inset. Body styles leave the host header, drag handle, and dismissal controls
intact. The host reserves bottom safe-area space on compact native layouts; setting content padding
to zero removes the decorative inset, not that space. Keyboard clearance is handled separately.

With `scrollable={false}`, the body fills the available sheet height, and the centered dialog uses
85% of the available height. Use `flex: 1, minHeight: 0` on your list. Default scrolling dialogs stay
content-sized on wide layouts. Presentation follows window size, including narrow desktop windows
and wide tablets.

The close button, backdrop, platform back action, web Escape key, and compact sheet gesture dismiss
the modal. Dismissal calls `onOpenChange(false)`; the plugin must update `open` to close it.

Modal children keep the plugin runtime context. `usePaseo`, `useRpc`, `useWorkspace`, and
`useAgent` work inside them.

### Scrolling

Import `ScrollView` and `FlatList` from `@getpaseo/plugin/client/react-native` when content can appear in a
Paseo modal. They accept React Native props and refs and integrate with the sheet's gestures. Outside
a sheet they use ordinary React Native scrolling. Do not import bottom-sheet libraries directly.

Use one vertical scroll owner: either the default modal body, or your own list with
`scrollable={false}`. A fixed-height vertical list nested inside the default scrolling body can compete
with the sheet for gestures on Android. Horizontal scrolling can coexist with the host's vertical body.

Both the default body and SDK lists share native sheet gestures: drag up to expand before scrolling;
drag down at the top of the list to collapse or dismiss. `scrollable={false}` removes the host's scroll
container without changing these gestures. Expand the sheet before using list methods such as
`scrollToEnd`; the sheet locks list offsets below its largest height.

```tsx
import { FlatList, Modal } from "@getpaseo/plugin/client/react-native";
import { Text } from "react-native";

// Inside your controlled Modal:
<Modal.Content
  scrollable={false}
  style={{ backgroundColor: theme.colors.surface1 }}
  contentContainerStyle={{ padding: 0, gap: 0 }}
>
  <FlatList
    style={{ flex: 1, minHeight: 0 }}
    data={items}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <Text style={{ padding: 16, color: theme.colors.foreground }}>{item.title}</Text>
    )}
  />
</Modal.Content>;
```

For horizontal tabs, place `<ScrollView horizontal style={{ flexGrow: 0 }}>…</ScrollView>` inside the
default `Modal.Content`. Keep the content's vertical scrolling on the host.

### Copy and paste

`copyText(text): Promise<void>` writes to the clipboard on the device running the app. Call it from a
user action and await it before reporting success. It rejects if the platform denies copying or the
clipboard is unavailable; browser permissions and secure-context requirements still apply.

```tsx
import { copyText, useToast } from "@getpaseo/plugin/client/react-native";

// Inside your component:
const toast = useToast();
async function copyResult() {
  try {
    await copyText(result);
    toast.show("Copied", { variant: "success" });
  } catch {
    toast.error("Could not copy. Select the text and use Copy.");
  }
}
```

Programmatic copying and native text selection are separate interactions. Use `<Text selectable>`
for long-press selection and OS Copy. Import `TextInput` from `@getpaseo/plugin/client/react-native` for modal forms. It accepts React Native
input props and refs, supports OS Paste, and registers focus with the native sheet so the keyboard
can raise the form. Outside a sheet it uses the ordinary input. A plain React Native input supports
Paste too, but does not register focus with the sheet; the keyboard can cover it. No clipboard read
API is needed for OS Paste. Avoid DOM clipboard code in native plugins and the deprecated
`Clipboard` export from `react-native`.

The runnable [modal UI example](https://github.com/getpaseo/paseo/tree/main/plugin-examples/modal-ui)
contains a padded form, full-width rows, a virtualized list, horizontal tabs, and a copy/paste input.

### Toasts

`useToast()` returns two methods:

| Method                    | Behavior                                                    |
| ------------------------- | ----------------------------------------------------------- |
| `show(message, options?)` | Shows a toast for 2,200 ms unless `durationMs` is supplied. |
| `error(message)`          | Shows an error toast for 3,200 ms.                          |

`show` accepts these options:

| Option       | Type                                                       | Default     |
| ------------ | ---------------------------------------------------------- | ----------- |
| `variant`    | `"default" \| "info" \| "success" \| "warning" \| "error"` | `"default"` |
| `durationMs` | `number`                                                   | `2200`      |

Showing another toast replaces the currently visible toast. An empty message is ignored.

### Icons

`Icon` renders a [Lucide icon](https://lucide.dev/icons/) from Paseo's installed icon set. Plugin bundles do not import
`lucide-react-native` or `react-native-svg`.

| Prop    | Type     | Required | Behavior                                        |
| ------- | -------- | -------- | ----------------------------------------------- |
| `name`  | `string` | Yes      | Lucide icon name. Unknown names render nothing. |
| `size`  | `number` | No       | Icon width and height.                          |
| `color` | `string` | No       | Icon color. Use a plugin theme token.           |
