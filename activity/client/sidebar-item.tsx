import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";

export const ACTIVITY_SCREEN_ID = "activity";

/** Sidebar header row for the global Activity screen (Paseo 0.11+ sidebar items). */
export function ActivitySidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Activity"
      active={currentScreen?.screenId === ACTIVITY_SCREEN_ID}
      onPress={() => openScreen({ screenId: ACTIVITY_SCREEN_ID })}
    />
  );
}
