import { usePaseo } from "@getpaseo/plugin/client";
import { useEffect, useState } from "react";
import { watchAgentDirectory } from "./agent-directory.ts";
import { agentStatusInfo } from "./workspace/list-host-agents.ts";
import type { AgentStatusInfo } from "./workspace/constants.ts";

/** Directory snapshots are authoritative; host UI cache absence is not a lifecycle event. */
export function useWorkspaceAgentStatuses(workspaceId: string) {
  const paseo = usePaseo();
  const [state, setState] = useState<{
    paseo: typeof paseo;
    workspaceId: string;
    data: Record<string, AgentStatusInfo>;
  }>();
  useEffect(() => watchAgentDirectory(paseo.agents, (snapshot) => {
    const data: Record<string, AgentStatusInfo> = {};
    for (const agent of snapshot.values()) {
      if (agent.workspaceId === workspaceId) data[agent.id] = agentStatusInfo(agent);
    }
    setState({ paseo, workspaceId, data });
  }), [paseo, workspaceId]);
  return { data: state?.paseo === paseo && state.workspaceId === workspaceId ? state.data : undefined };
}
