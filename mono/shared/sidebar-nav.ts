export const BUILTIN_SIDEBAR_NAV_IDS = [
  "sidebar-global-new-workspace",
  "sidebar-sessions",
  "sidebar-search",
  "sidebar-schedules",
] as const;

export const PLUGIN_SIDEBAR_NAV_PREFIX = "plugin-sidebar-";

export function isSidebarNavTestId(testId: string | null): boolean {
  if (!testId) return false;
  return (
    (BUILTIN_SIDEBAR_NAV_IDS as readonly string[]).includes(testId) ||
    testId.startsWith(PLUGIN_SIDEBAR_NAV_PREFIX)
  );
}
