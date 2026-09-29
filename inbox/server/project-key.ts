import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { normalizeRemoteUrl, pathProject, remoteProject, type ProjectRef } from "../shared/project-key.ts";

const exec = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["-C", cwd, ...args], { timeout: 5_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function remoteUrl(cwd: string): Promise<string | null> {
  const origin = await git(cwd, ["remote", "get-url", "origin"]);
  if (origin) return origin;
  const first = (await git(cwd, ["remote"]))?.split("\n")[0]?.trim();
  return first ? git(cwd, ["remote", "get-url", first]) : null;
}

/** Project for a directory: normalized git remote → repository root → the directory itself. */
export async function resolveProject(cwd: string): Promise<ProjectRef> {
  const remote = await remoteUrl(cwd);
  const normalized = remote ? normalizeRemoteUrl(remote) : null;
  if (normalized) return remoteProject(normalized);
  const root = await git(cwd, ["rev-parse", "--show-toplevel"]);
  return pathProject(root ?? cwd);
}

export function createProjectResolver() {
  const cache = new Map<string, Promise<ProjectRef>>();
  return (cwd: string): Promise<ProjectRef> => {
    let pending = cache.get(cwd);
    if (!pending) {
      pending = resolveProject(cwd);
      cache.set(cwd, pending);
    }
    return pending;
  };
}
