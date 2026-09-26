/** Splits `/feature fast_mode true` style args into the first token and the remainder. */
export function splitFirst(args: string): { head: string; rest: string } {
  const trimmed = args.trim();
  const match = /^(\S+)\s*([\s\S]*)$/.exec(trimmed);
  if (!match) return { head: "", rest: "" };
  return { head: match[1] ?? "", rest: (match[2] ?? "").trim() };
}

const TRUE_WORDS = new Set(["true", "on", "yes", "1", "enable", "enabled"]);
const FALSE_WORDS = new Set(["false", "off", "no", "0", "disable", "disabled"]);

export const TOGGLE_WORDS = ["on", "off"] as const;

export function parseToggle(value: string): boolean | null {
  const key = value.trim().toLowerCase();
  if (TRUE_WORDS.has(key)) return true;
  if (FALSE_WORDS.has(key)) return false;
  return null;
}

export function formatToggle(value: boolean): string {
  return value ? "on" : "off";
}
