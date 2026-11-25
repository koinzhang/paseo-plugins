import type { PluginPaseoApi } from "@getpaseo/plugin/client";

export async function loadWorkspaceProjectRoot(paseo: Pick<PluginPaseoApi, "workspaces">, workspaceId: string | null): Promise<string | null> {
  if (workspaceId === null) return null;
  const workspace = await paseo.workspaces.ref(workspaceId).refresh();
  return workspace?.projectRootPath ?? null;
}
