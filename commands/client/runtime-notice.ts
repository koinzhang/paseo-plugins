import type { AgentState } from "../shared/commands.ts";
import type { AgentControl } from "../shared/rpc.ts";

export function runtimeControlNotice(state: AgentState, control: AgentControl): string | null {
  if (state.status !== "running") return null;
  if (control.op === "thinking" && (state.provider === "codex" || state.provider === "claude")) {
    return "Thinking level applies next turn";
  }
  if (control.op === "mode" && state.provider === "codex") {
    return "Permission mode applies next turn";
  }
  return null;
}
