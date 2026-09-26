import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { DaemonClient, type WebSocketLike } from "@getpaseo/client/internal/daemon-client";
import WebSocket from "ws";

interface DaemonTarget {
  url: string;
  socketPath?: string;
}

function paseoHome(): string {
  const raw = process.env.PASEO_HOME ?? "~/.paseo";
  return path.resolve(raw.startsWith("~") ? path.join(homedir(), raw.slice(1)) : raw);
}

/** Mirrors the listen forms the daemon accepts: host:port, /path, unix:///path. */
export function toDaemonTarget(listen: string): DaemonTarget {
  const trimmed = listen.trim();
  const socketPath = trimmed.startsWith("unix://")
    ? trimmed.slice("unix://".length)
    : trimmed.startsWith("/")
      ? trimmed
      : null;
  if (socketPath) return { url: `ws+unix://${socketPath}:/ws`, socketPath };
  const endpoint = /^\d+$/.test(trimmed) ? `127.0.0.1:${trimmed}` : trimmed;
  return { url: `ws://${endpoint}/ws` };
}

async function resolveListen(): Promise<string> {
  if (process.env.PASEO_LISTEN) return process.env.PASEO_LISTEN;
  try {
    const pid = JSON.parse(await readFile(path.join(paseoHome(), "paseo.pid"), "utf8")) as {
      listen?: unknown;
    };
    if (typeof pid.listen === "string" && pid.listen) return pid.listen;
  } catch {
    // Fall through to the daemon default.
  }
  return `127.0.0.1:${process.env.PORT ?? "6767"}`;
}

async function connect(): Promise<DaemonClient> {
  const target = toDaemonTarget(await resolveListen());
  const client = new DaemonClient({
    url: target.url,
    clientId: `commands-plugin-${process.pid}`,
    clientType: "cli",
    password: process.env.PASEO_PASSWORD || undefined,
    connectTimeoutMs: 5_000,
    reconnect: { enabled: true },
    webSocketFactory: (url, options) =>
      new WebSocket(url, options?.protocols, {
        headers: options?.headers,
        ...(target.socketPath ? { socketPath: target.socketPath } : {}),
      }) as unknown as WebSocketLike,
  });
  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.close().catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach the Paseo daemon at ${target.url}: ${message}`);
  }
}

/** One lazily opened connection per plugin process, reopened after a failure. */
export function createDaemonConnection() {
  let pending: Promise<DaemonClient> | null = null;
  return {
    get(): Promise<DaemonClient> {
      pending ??= connect().catch((error: unknown) => {
        pending = null;
        throw error;
      });
      return pending;
    },
    async close(): Promise<void> {
      const current = pending;
      pending = null;
      if (current) await (await current.catch(() => null))?.close();
    },
  };
}
