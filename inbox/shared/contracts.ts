import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const ItemKind = z.enum(["agent", "note", "scratch"]);
export type ItemKind = z.infer<typeof ItemKind>;

export const AgentSnapshot = z.object({
  title: z.string().nullable(),
  provider: z.string(),
  model: z.string().nullable(),
  workspaceId: z.string().nullable(),
  cwd: z.string(),
  /** When the agent itself was created; missing on items starred before sorting existed. */
  createdAt: z.string().nullable().optional(),
});
export type AgentSnapshot = z.infer<typeof AgentSnapshot>;

export const Item = z.object({
  id: z.string(),
  kind: ItemKind,
  title: z.string().nullable(),
  body: z.string(),
  projectKey: z.string().nullable(),
  projectLabel: z.string().nullable(),
  agentId: z.string().nullable(),
  agentSnapshot: AgentSnapshot.nullable(),
  /** Workspace tag; always within the project tag. */
  workspaceId: z.string().nullable(),
  /** Last known workspace name, kept for archived workspaces. */
  workspaceLabel: z.string().nullable(),
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Item = z.infer<typeof Item>;

export const ProjectSummary = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
  archived: z.boolean(),
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;

export const WorkspaceSummary = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
  archived: z.boolean(),
});
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>;

/**
 * `starred`: added to the Inbox; `created`: the agent's own creation time for agents,
 * otherwise when the item was added; `updated`: last change; `name`: title A→Z.
 */
export const ItemSort = z.enum(["starred", "created", "updated", "name"]);
export type ItemSort = z.infer<typeof ItemSort>;

export const AgentState = z.enum(["active", "archived", "missing"]);
export type AgentState = z.infer<typeof AgentState>;

export const listItems = defineRpc({
  name: "items.list",
  input: z.object({
    kind: ItemKind.optional(),
    projectKey: z.string().optional(),
    query: z.string().optional(),
    /** Items tagged with exactly this workspace. */
    workspaceId: z.string().optional(),
    /**
     * A workspace's Inbox: items tagged with this workspace, plus items tagged
     * only with its project.
     */
    inboxOf: z.string().optional(),
    /** Defaults to `updated`. Pinned items always come first. */
    sort: ItemSort.optional(),
  }),
  output: z.object({
    items: z.array(Item),
    projects: z.array(ProjectSummary),
    /** Workspaces tagged on items of the requested kind, archived ones included. */
    workspaces: z.array(WorkspaceSummary),
    /** Tags of the listed items that are no longer active on the host. */
    archived: z.object({ projects: z.array(z.string()), workspaces: z.array(z.string()) }),
  }),
});

export const saveNote = defineRpc({
  name: "items.save",
  input: z.object({
    id: z.string().optional(),
    kind: z.enum(["note", "scratch"]),
    title: z.string().nullable().optional(),
    body: z.string(),
    /** On create: tag this workspace and its project. */
    workspaceId: z.string().optional(),
    /** On create: tag only this workspace's project. */
    projectOfWorkspace: z.string().optional(),
  }),
  output: z.object({ item: Item }),
});

/**
 * Sets a note's tags. A workspace must belong to the project; with only a
 * workspace, the project follows it. Agents' tags come from the agent itself.
 */
export const tagItem = defineRpc({
  name: "items.tag",
  input: z.object({
    id: z.string(),
    projectKey: z.string().nullable(),
    workspaceId: z.string().nullable(),
  }),
  output: z.object({ item: Item }),
});

export const TagProject = z.object({ key: z.string(), label: z.string() });
export type TagProject = z.infer<typeof TagProject>;

export const TagWorkspace = z.object({ id: z.string(), label: z.string(), projectKey: z.string() });
export type TagWorkspace = z.infer<typeof TagWorkspace>;

/** Active projects and workspaces that can be picked as tags. */
export const tagOptions = defineRpc({
  name: "tags.options",
  input: z.object({}),
  output: z.object({ projects: z.array(TagProject), workspaces: z.array(TagWorkspace) }),
});

export const updateItem = defineRpc({
  name: "items.update",
  input: z.object({
    id: z.string(),
    pinned: z.boolean().optional(),
    /** Only `note` is accepted: promotes a scratch entry. */
    kind: z.literal("note").optional(),
  }),
  output: z.object({ item: Item }),
});

export const deleteItem = defineRpc({
  name: "items.delete",
  input: z.object({ id: z.string() }),
  output: z.object({}),
});

export const starAgent = defineRpc({
  name: "agents.star",
  /** Tags follow the agent's own workspace and project. */
  input: z.object({ agentId: z.string() }),
  output: z.object({ item: Item, created: z.boolean() }),
});

export const AgentCandidate = z.object({
  id: z.string(),
  title: z.string().nullable(),
  provider: z.string(),
});
export type AgentCandidate = z.infer<typeof AgentCandidate>;

export const agentCandidates = defineRpc({
  name: "agents.candidates",
  input: z.object({ workspaceId: z.string() }),
  output: z.object({ agents: z.array(AgentCandidate) }),
});

/** Live host status; `attention` is a pending permission or an unseen finish / error. */
export const AgentLive = z.object({
  status: z.string(),
  attention: z.enum(["permission", "finished", "error"]).nullable(),
  permissions: z.number().optional(),
});
export type AgentLive = z.infer<typeof AgentLive>;

export const agentStates = defineRpc({
  name: "agents.states",
  input: z.object({ agentIds: z.array(z.string()) }),
  output: z.object({
    states: z.record(z.string(), AgentState),
    /** Only agents the host still knows. */
    live: z.record(z.string(), AgentLive).optional(),
  }),
});

export const unarchiveAgent = defineRpc({
  name: "agents.unarchive",
  input: z.object({ agentId: z.string() }),
  output: z.object({ restoredWorkspace: z.boolean() }),
});
