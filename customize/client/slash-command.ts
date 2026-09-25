import { settingsRpc } from "@getpaseo/plugin";
import type { PluginAgentCommandContext } from "@getpaseo/plugin/client";
import { isProviderId } from "../shared/providers.ts";
import { selectionSettings } from "../shared/selection-settings.ts";

const { read, write } = settingsRpc(selectionSettings.id);

/** Navigate even if the current agent cannot supply a usable board selection. */
export async function openCustomizeFromAgent({ agent, workspace, rpc, openSurface }: PluginAgentCommandContext): Promise<void> {
  const provider = isProviderId(agent.provider) ? agent.provider : null;
  const projectRoot = workspace.projectRootPath?.trim() ? workspace.projectRootPath : null;
  try {
    if (!provider && !projectRoot) return;

    // Preserve the rest of the host-scoped document and retry once if another client writes first.
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = await rpc(read, {});
      if (current.status !== "ready") return;
      const parsed = selectionSettings.schema.safeParse(current.values);
      if (!parsed.success) return;

      const values = {
        ...parsed.data,
        ...(provider ? { provider } : {}),
        ...(projectRoot ? { projectRoot } : {}),
      };
      if (parsed.data.provider === values.provider && parsed.data.projectRoot === values.projectRoot) return;
      const result = await rpc(write, { revision: current.revision, values });
      if (result.status === "saved") return;
      if (result.status !== "conflict") throw new Error(result.error);
    }
    throw new Error("Customize selection changed concurrently; try again");
  } finally {
    openSurface("customize");
  }
}
