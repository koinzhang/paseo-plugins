import type { PluginHookContext, PluginLifecycleEvents } from "@getpaseo/plugin/server";

/**
 * Host types re-derived from the plugin SDK.
 *
 * Plugins must only import host-provided specifiers (`@getpaseo/plugin*`, zod,
 * react, react-native, @tanstack/react-query, node builtins): Paseo compiles
 * plugin sources without installing dependencies, so direct `@getpaseo/protocol`
 * or `@getpaseo/client` imports fail the runtime-boundary build.
 */
export type AgentTimelineItem =
  PluginLifecycleEvents["agent.turn_ended"]["timeline"][number];

export type PaseoApi = PluginHookContext["paseo"];
