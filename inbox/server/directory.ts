import type { PaseoApi } from "@getpaseo/client";
import type { ProjectRef } from "../shared/project-key.ts";

const PAGE_LIMIT = 200;
const MAX_PAGES = 100;

export interface DirectoryWorkspace {
  label: string;
  project: ProjectRef;
}

/** Active projects (by Inbox project key) and workspaces on the host. */
export interface Directory {
  projects: Map<string, string>;
  workspaces: Map<string, DirectoryWorkspace>;
}

type ResolveProject = (cwd: string) => Promise<ProjectRef>;

/**
 * Paseo projects are keyed the way the Inbox keys them (git remote → repository
 * root → directory) by resolving each project root, so older items keep matching.
 * Archived projects and workspaces are absent: the daemon lists active ones only.
 */
export async function loadDirectory(paseo: PaseoApi, resolveProject: ResolveProject): Promise<Directory> {
  const roots = new Map<string, { root: string; label: string }>();
  const workspaceProjects = new Map<string, { label: string; projectId: string }>();
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const page = await paseo.workspaces.list({
      page: { limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    for (const workspace of page.entries) {
      workspaceProjects.set(workspace.id, { label: workspace.name, projectId: workspace.projectId });
      roots.set(workspace.projectId, { root: workspace.projectRootPath, label: workspace.projectDisplayName });
    }
    if (!page.pageInfo.hasMore || !page.pageInfo.nextCursor) break;
    cursor = page.pageInfo.nextCursor;
  }
  try {
    const { projects } = await paseo.projects.list();
    for (const project of projects) {
      roots.set(project.projectId, { root: project.projectRootPath, label: project.projectDisplayName });
    }
  } catch (error) {
    console.error("[inbox] projects unavailable; only projects with active workspaces are known", error);
  }

  const byId = new Map<string, ProjectRef>();
  await Promise.all(
    [...roots].map(async ([projectId, { root, label }]) => {
      const { key } = await resolveProject(root);
      byId.set(projectId, { key, label });
    }),
  );
  const projects = new Map([...byId.values()].map((project) => [project.key, project.label]));
  const workspaces = new Map<string, DirectoryWorkspace>();
  for (const [id, { label, projectId }] of workspaceProjects) {
    const project = byId.get(projectId);
    if (project) workspaces.set(id, { label, project });
  }
  return { projects, workspaces };
}
