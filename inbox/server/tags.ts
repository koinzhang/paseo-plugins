import type { Item } from "../shared/contracts.ts";
import type { Directory } from "./directory.ts";
import type { Tags } from "./store.ts";

/**
 * Validates a tag change. Only active projects / workspaces can be newly picked;
 * the item's current tags may stay even once archived. A workspace must belong to
 * the project, and with no project given the project follows the workspace.
 */
export function resolveTags(
  item: Pick<Item, "projectKey" | "projectLabel" | "workspaceId" | "workspaceLabel">,
  request: { projectKey: string | null; workspaceId: string | null },
  directory: Directory,
): Tags {
  let workspace: Tags["workspace"] = null;
  let workspaceProjectKey: string | null = null;
  if (request.workspaceId) {
    const active = directory.workspaces.get(request.workspaceId);
    if (active) {
      workspace = { id: request.workspaceId, label: active.label };
      workspaceProjectKey = active.project.key;
    } else if (request.workspaceId === item.workspaceId) {
      workspace = { id: item.workspaceId, label: item.workspaceLabel ?? item.workspaceId };
      workspaceProjectKey = item.projectKey;
    } else {
      throw new Error("That workspace is archived or no longer on this host");
    }
  }

  const projectKey = request.projectKey ?? workspaceProjectKey;
  if (workspace && projectKey !== workspaceProjectKey) {
    throw new Error(`Workspace ${workspace.label} belongs to another project`);
  }
  if (!projectKey) return { project: null, workspace: null };

  const label =
    directory.projects.get(projectKey) ??
    (projectKey === item.projectKey ? (item.projectLabel ?? projectKey) : null);
  if (label === null) throw new Error("That project is archived or no longer on this host");
  return { project: { key: projectKey, label }, workspace };
}
