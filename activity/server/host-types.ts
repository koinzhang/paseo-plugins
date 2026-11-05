import type { PluginHookContext, PluginHookEvents } from "@getpaseo/plugin/server";

/**
 * Host types re-derived from the plugin SDK.
 *
 * Plugins must only import host-provided specifiers (`@getpaseo/plugin*`, zod,
 * react, react-native, @tanstack/react-query, node builtins) or dependencies the
 * plugin installs itself: Paseo compiles plugin sources without installing
 * dependencies, so `@getpaseo/protocol` and `@getpaseo/client` imports fail the
 * runtime-boundary build unless they resolve from the plugin's node_modules.
 */
export type AgentTimelineItem = PluginHookEvents["agent.turn.after"]["timeline"][number];

export type PaseoApi = PluginHookContext["paseo"];
