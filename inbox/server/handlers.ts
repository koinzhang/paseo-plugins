import type { PaseoApi } from "@getpaseo/client";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  agentCandidates,
  agentStates,
  deleteItem,
  listItems,
  saveNote,
  starAgent,
  tagItem,
  tagOptions,
  unarchiveAgent,
  updateItem,
} from "../shared/contracts.ts";
import { agentState, lookupAgent, unarchiveAgent as runUnarchive, workspaceAgents } from "./agents.ts";
import type { createDaemonConnection } from "./daemon.ts";
import { type Directory, loadDirectory } from "./directory.ts";
import type { createProjectResolver } from "./project-key.ts";
import type { InboxStore } from "./store.ts";
import { resolveTags } from "./tags.ts";

interface Deps {
  store: InboxStore;
  resolveProject: ReturnType<typeof createProjectResolver>;
  daemon: ReturnType<typeof createDaemonConnection>;
}

export function registerHandlers(server: PluginServerContext, { store, resolveProject, daemon }: Deps): void {
  const directory = (paseo: PaseoApi) => loadDirectory(paseo, resolveProject);
  /** Null when the host directory is unreadable; then nothing is treated as archived. */
  const tryDirectory = (paseo: PaseoApi): Promise<Directory | null> =>
    directory(paseo).catch((error: unknown) => {
      console.error("[inbox] workspaces unavailable; archived tags are not marked", error);
      return null;
    });

  server.handle(listItems, async ({ inboxOf, ...filter }, { paseo }) => {
    const known = await tryDirectory(paseo);
    if (known) {
      store.refreshLabels(
        known.projects,
        new Map([...known.workspaces].map(([id, workspace]) => [id, workspace.label])),
      );
    }
    const items = store.list({
      ...filter,
      ...(inboxOf
        ? { inboxOf: { workspaceId: inboxOf, projectKey: known?.workspaces.get(inboxOf)?.project.key ?? null } }
        : {}),
    });
    const projectArchived = (key: string) => Boolean(known && !known.projects.has(key));
    const workspaceArchived = (id: string) => Boolean(known && !known.workspaces.has(id));
    const archived = { projects: new Set<string>(), workspaces: new Set<string>() };
    for (const item of items) {
      if (item.projectKey && projectArchived(item.projectKey)) archived.projects.add(item.projectKey);
      if (item.workspaceId && workspaceArchived(item.workspaceId)) archived.workspaces.add(item.workspaceId);
    }
    return {
      items,
      projects: store.projects(filter.kind).map((entry) => ({ ...entry, archived: projectArchived(entry.key) })),
      workspaces: store.workspaces(filter.kind).map((entry) => ({ ...entry, archived: workspaceArchived(entry.id) })),
      archived: { projects: [...archived.projects], workspaces: [...archived.workspaces] },
    };
  });

  server.handle(saveNote, async ({ id, kind, title, body, workspaceId, projectOfWorkspace }, { paseo }) => {
    if (id) return { item: store.updateNote(id, { kind, title, body }) };
    const target = workspaceId ?? projectOfWorkspace;
    if (!target) return { item: store.createNote({ kind, title, body }) };
    const found = (await tryDirectory(paseo))?.workspaces.get(target);
    if (!found && workspaceId) throw new Error("This workspace is archived or no longer on this host");
    return {
      item: store.createNote({
        kind,
        title,
        body,
        project: found?.project ?? null,
        workspace: workspaceId && found ? { id: workspaceId, label: found.label } : null,
      }),
    };
  });

  server.handle(tagItem, async ({ id, projectKey, workspaceId }, { paseo }) => {
    const item = store.get(id);
    if (!item) throw new Error(`Inbox item ${id} not found`);
    const tags = resolveTags(item, { projectKey, workspaceId }, await directory(paseo));
    return { item: store.setTags(id, tags) };
  });

  server.handle(tagOptions, async (_input, { paseo }) => {
    const known = await directory(paseo);
    return {
      projects: [...known.projects].map(([key, label]) => ({ key, label })),
      workspaces: [...known.workspaces].map(([id, { label, project }]) => ({
        id,
        label,
        projectKey: project.key,
      })),
    };
  });

  server.handle(updateItem, ({ id, ...patch }) => ({ item: store.update(id, patch) }));

  server.handle(deleteItem, ({ id }) => {
    store.delete(id);
    return {};
  });

  server.handle(starAgent, async ({ agentId }, { paseo }) => {
    const existing = store.findByAgent(agentId);
    if (existing) return { item: existing, created: false };
    const found = await lookupAgent(paseo, agentId);
    if (!found) throw new Error("Agent not found on this host");
    const workspaceId = found.snapshot.workspaceId;
    const workspace = workspaceId ? (await tryDirectory(paseo))?.workspaces.get(workspaceId) : undefined;
    const project = workspace?.project ?? (await resolveProject(found.snapshot.cwd));
    return store.starAgent(
      agentId,
      found.snapshot,
      project,
      workspaceId ? { id: workspaceId, label: workspace?.label ?? workspaceId } : null,
    );
  });

  server.handle(agentCandidates, async ({ workspaceId }, { paseo }) => ({
    agents: (await workspaceAgents(paseo, workspaceId)).filter((agent) => !store.findByAgent(agent.id)),
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
