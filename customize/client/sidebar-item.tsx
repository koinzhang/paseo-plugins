import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { CUSTOMIZE_SCREEN_ID } from "./screen-id.ts";

/** Sidebar header row that opens the Customize screen. */
export function CustomizeSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="FolderCog"
      active={currentScreen?.screenId === CUSTOMIZE_SCREEN_ID}
      onPress={() => openScreen({ screenId: CUSTOMIZE_SCREEN_ID })}
    />
  );
}
