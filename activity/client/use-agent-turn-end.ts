import { usePaseo } from "@getpaseo/plugin/client";
import { useEffect, useRef } from "react";

const TURN_END_DEBOUNCE_MS = 300;
const INGEST_SETTLE_MS = 2_000;

type AgentTurnEndScope = {
  agentId?: string;
  workspaceId?: string;
};

/** Shared debounce/ingest settle scheduling; callers choose the signal explicitly. */
function useActivityRefresh(scope: AgentTurnEndScope, onTurnEnd: () => void): void {
  const paseo = usePaseo();
  const { agentId, workspaceId } = scope;
  const callbackRef = useRef(onTurnEnd);

  useEffect(() => {
    callbackRef.current = onTurnEnd;
  });

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
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
    };
    const unsubscribe = agentId != null
      ? paseo.agents.ref(agentId).timeline.subscribe(({ event }) => {
          if (["turn_completed", "turn_failed", "turn_canceled", "replacement"].includes(event.type)) schedule();
        })
      : paseo.agents.subscribe((update) => {
          // Workspace-wide hint only. The 15s query poll owns completeness.
          if (update.kind === "remove") {
            schedule();
            return;
          }
          const agent = update.agent;
          if (agent.workspaceId !== workspaceId) return;
          if (agent.status !== "running" && agent.status !== "initializing") schedule();
        });
    if ("ready" in unsubscribe) {
      void (unsubscribe.ready as Promise<void>).catch((error: unknown) => {
        console.error("[activity] timeline observation failed; polling remains active", error);
      });
    }
    return () => {
      unsubscribe();
      if (debounce != null) clearTimeout(debounce);
      if (settle != null) clearTimeout(settle);
    };
  }, [paseo, agentId, workspaceId]);
}

/** Actual turn terminal events; directory status does not imply completion. */
export function useAgentTurnEnd(scope: { agentId: string }, onTurnEnd: () => void): void {
  useActivityRefresh(scope, onTurnEnd);
}

/** Best-effort directory hint, never a turn-end signal. */
export function useWorkspaceActivityRefresh(workspaceId: string, refresh: () => void): void {
  useActivityRefresh({ workspaceId }, refresh);
}
