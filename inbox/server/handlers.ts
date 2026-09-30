import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  agentCandidates,
  agentStates,
  deleteItem,
  listItems,
  saveNote,
  starAgent,
  unarchiveAgent,
  updateItem,
} from "../shared/contracts.ts";
import {
  activeWorkspaces,
  agentState,
  lookupAgent,
  unarchiveAgent as runUnarchive,
  workspaceAgents,
} from "./agents.ts";
import type { createDaemonConnection } from "./daemon.ts";
import type { createProjectResolver } from "./project-key.ts";
import type { InboxStore } from "./store.ts";

interface Deps {
  store: InboxStore;
  resolveProject: ReturnType<typeof createProjectResolver>;
  daemon: ReturnType<typeof createDaemonConnection>;
}

export function registerHandlers(server: PluginServerContext, { store, resolveProject, daemon }: Deps): void {
  server.handle(listItems, async (filter, { paseo }) => {
    const active = await activeWorkspaces(paseo).catch((error: unknown) => {
      console.error("[inbox] active workspaces unavailable; archived workspaces stay visible", error);
      return null;
    });
    const hidden = active ? store.workspaceIds().filter((id) => !active.has(id)) : [];
    return {
      items: store.list({ ...filter, hiddenWorkspaceIds: hidden }),
      projects: store.projects(hidden, filter.kind),
      workspaces: store
        .workspaces(hidden, filter.kind)
        .map(({ id, count }) => ({ id, label: active?.get(id) ?? id, count })),
    };
  });

  server.handle(saveNote, async ({ id, kind, title, body, cwd, workspaceId }) => {
    if (id) return { item: store.updateNote(id, { kind, title, body }) };
    const project = cwd ? await resolveProject(cwd) : null;
    return { item: store.createNote({ kind, title, body, project, workspaceId }) };
  });

  server.handle(updateItem, ({ id, ...patch }) => ({ item: store.update(id, patch) }));

  server.handle(deleteItem, ({ id }) => {
    store.delete(id);
    return {};
  });

  server.handle(starAgent, async ({ agentId, workspaceId }, { paseo }) => {
    const existing = store.findByAgent(agentId);
    if (existing) return store.starAgent(agentId, existing.agentSnapshot!, null, workspaceId);
    const found = await lookupAgent(paseo, agentId);
    if (!found) throw new Error("Agent not found on this host");
    const project = await resolveProject(found.snapshot.cwd);
    return store.starAgent(agentId, found.snapshot, project, workspaceId);
  });

  server.handle(agentCandidates, async ({ workspaceId }, { paseo }) => ({
    agents: (await workspaceAgents(paseo, workspaceId)).filter(
      (agent) => store.findByAgent(agent.id)?.workspaceId !== workspaceId,
    ),
  }));

  server.handle(agentStates, async ({ agentIds }, { paseo }) => {
    const entries = await Promise.all(
      agentIds.map(async (id) => [id, await agentState(paseo, id)] as const),
    );
    return {
      states: Object.fromEntries(entries.map(([id, { state }]) => [id, state])),
      live: Object.fromEntries(entries.flatMap(([id, { live }]) => (live ? [[id, live]] : []))),
    };
  });

  server.handle(unarchiveAgent, async ({ agentId }) => runUnarchive(await daemon.get(), agentId));
}
