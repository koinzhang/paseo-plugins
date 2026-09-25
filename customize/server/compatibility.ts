import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Compatibility } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";
import { COMPATIBLE_PROVIDERS } from "../shared/compatibility.ts";
import type { ScanContext } from "./scan-kit.ts";

const truthy = (value: string | undefined) => value != null && value !== "" && value !== "0" && value.toLowerCase() !== "false";

export function opencodeExternalSkillSwitch(env: ScanContext["env"]): { enabled: boolean; disabledBy?: string } {
  for (const key of ["OPENCODE_DISABLE_EXTERNAL_SKILLS", "OPENCODE_DISABLE_CLAUDE_CODE", "OPENCODE_DISABLE_CLAUDE_CODE_SKILLS"] as const) {
    if (truthy(env[key])) return { enabled: false, disabledBy: key };
  }
  return { enabled: true };
}

/** Cursor IDE preference; absence of the key means its documented default-on behavior. */
export function cursorThirdPartySwitch(ctx: Pick<ScanContext, "home" | "platform">): Compatibility {
  if (ctx.platform !== "darwin") return { enabled: null, source: "unavailable" };
  const file = path.join(ctx.home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
  if (!existsSync(file)) return { enabled: true, source: "default" };
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get("cursor/thirdPartyExtensibilityEnabled") as { value?: unknown } | undefined;
    if (!row) return { enabled: true, source: "default" };
    if (row.value === "true") return { enabled: true, source: "cursorSettings" };
    if (row.value === "false") return { enabled: false, source: "cursorSettings" };
    return { enabled: null, source: "unavailable" };
  } catch {
    return { enabled: null, source: "unavailable" };
  } finally {
    db?.close();
  }
}

export function compatibilityFor(provider: ProviderId, ctx: ScanContext): Compatibility | null {
  if (!COMPATIBLE_PROVIDERS.has(provider)) return null;
  if (provider === "cursor") return cursorThirdPartySwitch(ctx);
  if (provider === "opencode") {
    const flag = opencodeExternalSkillSwitch(ctx.env);
    return { enabled: flag.enabled, source: flag.disabledBy ?? "default" };
  }
  return { enabled: true, source: "builtIn" };
}
