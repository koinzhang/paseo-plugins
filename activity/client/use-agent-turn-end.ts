import { usePaseo } from "@getpaseo/plugin/client";
import { useEffect, useRef } from "react";

const TURN_END_DEBOUNCE_MS = 300;
const INGEST_SETTLE_MS = 2_000;

type AgentTurnEndScope = {
  agentId?: string;
  workspaceId?: string;
};

/** Refresh plugin queries when a matching agent's turn ends (host push, polling stays as fallback). */
export function useAgentTurnEnd(scope: AgentTurnEndScope, onTurnEnd: () => void): void {
  const paseo = usePaseo();
  const { agentId, workspaceId } = scope;
  const callbackRef = useRef(onTurnEnd);

  useEffect(() => {
    callbackRef.current = onTurnEnd;
  });

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = paseo.agents.subscribe((update) => {
      if (update.kind !== "upsert") return;
      const agent = update.agent;
      if (agentId != null && agent.id !== agentId) return;
      // Missing workspaceId: treat as possibly in-scope (same rule as 035 status subscribe).
      if (
        workspaceId != null &&
        agent.workspaceId != null &&
        agent.workspaceId !== workspaceId
      ) {
        return;
      }
      if (agent.status === "running" || agent.status === "initializing") return;
      if (debounce != null) clearTimeout(debounce);
      if (settle != null) clearTimeout(settle);
      debounce = setTimeout(() => {
        debounce = null;
        callbackRef.current();
      }, TURN_END_DEBOUNCE_MS);
      settle = setTimeout(() => {
        settle = null;
        callbackRef.current();
      }, INGEST_SETTLE_MS);
    });
    return () => {
      unsubscribe();
      if (debounce != null) clearTimeout(debounce);
      if (settle != null) clearTimeout(settle);
    };
  }, [paseo, agentId, workspaceId]);
}
