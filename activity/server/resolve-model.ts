import type { PaseoApi } from "@getpaseo/client";

/** Read the agent's current model id from the daemon snapshot. */
export async function resolveAgentModel(
  paseo: PaseoApi,
  agentId: string,
): Promise<string | null> {
  try {
    const handle = paseo.agents.ref(agentId);
    let snap = handle.current();
    if (!snap) {
      await handle.refresh();
      snap = handle.current();
    }
    const raw = snap?.model ?? snap?.runtimeInfo?.model ?? null;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  } catch (error) {
    console.error("[activity] resolveAgentModel failed", error);
    return null;
  }
}

/** Normalize a snapshot / list model field for storage. */
export function normalizeModelId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
