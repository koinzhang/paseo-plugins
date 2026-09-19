/** Hand-off from pill popover → agent Activity panel for a SKILL.md detail view. */

export type PendingSkillOpen = {
  agentId: string;
  skillName: string;
  path: string;
};

const pendingByAgent = new Map<string, PendingSkillOpen>();
const listeners = new Set<() => void>();

/** Keep pending readable across openPanel / Strict Mode remounts in the same turn. */
const PENDING_TTL_MS = 5_000;

function notify(): void {
  for (const listener of listeners) listener();
}

export function requestOpenSkillInPanel(next: PendingSkillOpen): void {
  pendingByAgent.set(next.agentId, next);
  notify();
  setTimeout(() => {
    if (pendingByAgent.get(next.agentId) === next) {
      pendingByAgent.delete(next.agentId);
    }
  }, PENDING_TTL_MS);
}

/**
 * Peek the pending open for this agent without clearing.
 * Panel must call {@link clearPendingSkillOpen} after applying (delayed) or when
 * the user leaves the detail view — immediate consume races with remount.
 */
export function consumePendingSkillOpen(agentId: string): PendingSkillOpen | null {
  return pendingByAgent.get(agentId) ?? null;
}

export function clearPendingSkillOpen(agentId: string, expected?: PendingSkillOpen): void {
  const current = pendingByAgent.get(agentId);
  if (!current) return;
  if (expected && current !== expected) return;
  pendingByAgent.delete(agentId);
}

export function subscribePendingSkillOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
