import { useEffect } from "react";

type OpenAgent = (input: { agentId: string }) => void;

/** Last-registered wins; cleanup pops this registration only. */
const stack: OpenAgent[] = [];

export function setOpenAgent(open: OpenAgent | null | undefined): () => void {
  if (!open) return () => {};
  stack.push(open);
  return () => {
    const index = stack.lastIndexOf(open);
    if (index >= 0) stack.splice(index, 1);
  };
}

/** Register host `navigation.openAgent` while a navigable surface/panel is mounted. */
export function useRegisterOpenAgent(open: OpenAgent | null | undefined): void {
  useEffect(() => setOpenAgent(open), [open]);
}

export function tryOpenAgent(agentId: string): boolean {
  const open = stack[stack.length - 1];
  if (!open) return false;
  open({ agentId });
  return true;
}

/** Focus another agent conversation via the registered host navigation bridge. */
export function openAttentionAgent(agentId: string): void {
  tryOpenAgent(agentId);
}
