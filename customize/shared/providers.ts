/** Phase-one providers: Paseo built-ins (provider-manifest `BUILTIN_PROVIDER_IDS`) plus Cursor. */
export const PROVIDER_IDS = ["claude", "codex", "cursor", "copilot", "opencode", "pi", "omp", "cline", "codebuddy-code", "gemini", "goose", "grok", "kilo", "kiro", "kimi", "qwen-code", "traecli"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  copilot: "Copilot",
  opencode: "OpenCode",
  pi: "Pi",
  omp: "Oh My Pi",
  cline: "Cline",
  "codebuddy-code": "CodeBuddy Code",
  gemini: "Gemini CLI",
  goose: "Goose",
  grok: "Grok Build",
  kilo: "Kilo Code",
  kiro: "Kiro CLI",
  kimi: "Kimi Code",
  "qwen-code": "Qwen Code",
  traecli: "TraeCode CLI",
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}
