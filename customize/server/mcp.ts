import type { Entry, Scope, Status } from "../shared/contracts.ts";
import { isRecord, type EntryInput } from "./scan-kit.ts";

const SECRET_KEY = /(token|secret|password|passwd|api[-_]?key|auth|bearer|credential|cookie|session)/i;
const MASK = "••••••";

function redactArg(arg: string, previous: string | undefined): string {
  if (previous && /^--?[\w-]+$/.test(previous) && SECRET_KEY.test(previous)) return MASK;
  const eq = /^(--?[\w-]+)=(.+)$/.exec(arg);
  if (eq && SECRET_KEY.test(eq[1]!)) return `${eq[1]}=${MASK}`;
  if (/^(sk|ghp|gho|xox[abp]|glpat|tai_pat)[-_][A-Za-z0-9_\-.]{8,}/.test(arg)) return MASK;
  return arg.replace(/([?&](?:token|key|secret|access_token|api_key)=)[^&]+/gi, `$1${MASK}`);
}

function redactArgs(args: unknown): unknown {
  if (!Array.isArray(args)) return args;
  return args.map((arg, index) => (typeof arg === "string" ? redactArg(arg, args[index - 1] as string | undefined) : arg));
}

function maskValues(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).map((key) => [key, MASK]));
}

/** Server config safe to show: env / headers values masked, secret-looking args and URL params masked. */
export function redactServer(config: unknown): unknown {
  if (!isRecord(config)) return config;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (/^(env|envs|headers|http_headers|env_http_headers|environment)$/i.test(key)) out[key] = maskValues(value);
    else if (key === "args") out[key] = redactArgs(value);
    else if (key === "command" && Array.isArray(value)) out[key] = redactArgs(value);
    else if ((key === "url" || key === "uri") && typeof value === "string") out[key] = redactArg(value, undefined);
    else if (SECRET_KEY.test(key) && typeof value === "string") out[key] = MASK;
    else out[key] = value;
  }
  return out;
}

/** `{ transport, target }` for the list meta line. */
export function describeServer(config: unknown): { transport: string; target: string } {
  if (!isRecord(config)) return { transport: "?", target: "" };
  const url = typeof config.url === "string" ? config.url : typeof config.uri === "string" ? config.uri : typeof config.serverUrl === "string" ? config.serverUrl : undefined;
  const type = typeof config.type === "string" ? config.type : typeof config.transport === "string" ? config.transport : undefined;
  if (url) {
    const safe = redactArg(url, undefined);
    const transport = type && type !== "remote" ? type : "http";
    return { transport, target: safe };
  }
  const rawCommand = config.command ?? config.cmd;
  const command = Array.isArray(rawCommand) ? (rawCommand as unknown[]) : typeof rawCommand === "string" ? [rawCommand] : [];
  const args = Array.isArray(config.args) ? (config.args as unknown[]) : [];
  const parts = (redactArgs([...command, ...args]) as unknown[]).filter((part): part is string => typeof part === "string");
  return { transport: type && type !== "local" ? type : "stdio", target: parts.join(" ") };
}

export function mcpEntry(input: {
  name: string;
  config: unknown;
  file: string;
  source: string;
  scope: Scope;
  status: Status;
  reason?: EntryInput["reason"];
  tags?: Entry["tags"];
}): EntryInput {
  const { transport, target } = describeServer(input.config);
  return {
    category: "mcp",
    scope: input.scope,
    name: input.name,
    path: input.file,
    source: input.source,
    description: target,
    status: input.status,
    ...(input.reason ? { reason: input.reason } : {}),
    tags: input.tags ?? [],
    mcp: { name: input.name, transport, target },
  };
}

/** `{ mcpServers: { … } }`-style map (Claude / Cursor / Copilot / OMP). */
export function serversOf(value: unknown, key = "mcpServers"): Array<[string, unknown]> {
  if (!isRecord(value)) return [];
  const map = value[key];
  return isRecord(map) ? Object.entries(map) : [];
}
