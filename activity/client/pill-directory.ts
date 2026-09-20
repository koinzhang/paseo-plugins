import { watchAgentDirectory, type AgentsApi, type DirectoryAgent } from "./agent-directory.ts";

/** Pill registrations follow the owned directory; archived agents have no composer pill. */
export function watchPillDirectory(
  agents: AgentsApi,
  onAgent: (agent: DirectoryAgent) => void,
  onRemove: (agentId: string) => void,
  intervalMs = 15_000,
  onPolled?: (agent: DirectoryAgent) => void,
): () => void {
  const versions = new Map<string, string>();
  return watchAgentDirectory(agents, (snapshot, update) => {
    for (const id of versions.keys()) {
      const agent = snapshot.get(id);
      if (!agent || agent.archivedAt) {
        versions.delete(id);
        onRemove(id);
      }
    }
    for (const agent of snapshot.values()) {
      if (agent.archivedAt) continue;
      const version = JSON.stringify([agent.workspaceId, agent.status, agent.updatedAt,
        agent.lastUserMessageAt, agent.activeTurn?.turnId]);
      if (versions.get(agent.id) !== version) {
        versions.set(agent.id, version);
        onAgent(agent);
      }
      if (!update) onPolled?.(agent);
    }
  }, intervalMs);
}
