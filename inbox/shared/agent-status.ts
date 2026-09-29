import type { AgentLive, AgentState } from "./contracts.ts";

export type AgentStatusTone = "warning" | "danger" | "success" | "accent" | "muted";

export interface AgentStatusDisplay {
  label: string;
  tone: AgentStatusTone;
}

/** Bot icon highlight, as in Activity's Explorer rows: error > permission > finished. */
export type AgentAttention = "error" | "permission" | "finished" | null;

export function agentAttention(live: AgentLive | undefined): AgentAttention {
  if (!live) return null;
  if (live.status === "error") return "error";
  return live.attention;
}

export function isAgentRunning(live: AgentLive | undefined): boolean {
  return live?.status === "running" || live?.status === "initializing";
}

/** Same precedence as Activity's Explorer rows: error > permission > running > finished. */
export function describeAgentStatus(
  state: AgentState | undefined,
  live: AgentLive | undefined,
): AgentStatusDisplay | null {
  if (state === "archived") return { label: "Archived", tone: "warning" };
  if (state === "missing") return { label: "Unavailable", tone: "danger" };
  if (!live) return null;
  if (live.status === "error" || live.attention === "error") return { label: "Error", tone: "danger" };
  if (live.attention === "permission") return { label: "Needs permission", tone: "warning" };
  if (live.status === "running" || live.status === "initializing") {
    return { label: "Running", tone: "accent" };
  }
  if (live.attention === "finished") return { label: "Finished", tone: "success" };
  if (live.status === "closed") return { label: "Closed", tone: "muted" };
  return { label: "Idle", tone: "muted" };
}
