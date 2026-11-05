import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { INBOX_SCREEN_ID } from "./screen-id.ts";

/** Sidebar header row that opens the Inbox screen. */
export function InboxSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Inbox"
      active={currentScreen?.screenId === INBOX_SCREEN_ID}
      onPress={() => openScreen({ screenId: INBOX_SCREEN_ID })}
    />
  );
}
