export type NestedSkillCall = {
  callId: string;
  name: string;
  status: "completed" | "failed" | "running";
  detail: { type: "read"; filePath: string } | { type: "shell"; command: string };
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function nestedSkillCalls(output: unknown): NestedSkillCall[] {
  const calls = record(record(output)?.details)?.calls;
  if (!Array.isArray(calls)) return [];
  const nested: NestedSkillCall[] = [];
  for (const value of calls) {
    const call = record(value);
    if (!call || typeof call.id !== "string" || !call.id ||
        (call.name !== "read" && call.name !== "bash")) continue;
    let args = call.args;
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        continue;
      }
    }
    const input = record(args);
    const path = input?.path;
    const command = input?.command;
    const detail = call.name === "read" && typeof path === "string"
      ? { type: "read" as const, filePath: path }
      : call.name === "bash" && typeof command === "string"
        ? { type: "shell" as const, command }
        : null;
    if (!detail) continue;
    const status = call.status === "ok" || call.status === "completed" ? "completed"
      : call.status === "error" || call.status === "failed" ? "failed"
        : call.status === "running" ? "running" : null;
    if (status) nested.push({ callId: call.id, name: call.name, status, detail });
  }
  return nested;
}
