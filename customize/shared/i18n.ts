import type { Category, ReasonCode, Scope, Status, Tag } from "./contracts.ts";

export const APP_LANGUAGES = ["en", "zh-CN"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** Paseo `language` setting (or `system` → OS languages) → a supported catalog. */
export function resolveAppLanguage(setting: string | null | undefined, systemLanguages: readonly string[] = []): AppLanguage {
  const explicit = matchLanguage(setting ?? "");
  if (explicit && setting !== "system") return explicit;
  for (const candidate of systemLanguages) {
    const match = matchLanguage(candidate);
    if (match) return match;
  }
  return "en";
}

function matchLanguage(tag: string): AppLanguage | null {
  const lower = tag.trim().toLowerCase();
  if (!lower || lower === "system") return null;
  if (lower.split(/[-_]/)[0] === "zh") return "zh-CN";
  if (lower.split(/[-_]/)[0] === "en") return "en";
  return null;
}

export interface Messages {
  title: string;
  openBoard: string;
  provider: string;
  builtinProvider: string;
  noEnabledProvider: string;
  project: string;
  noProject: string;
  chooseProvider: string;
  chooseProject: string;
  closeMenu: string;
  refresh: string;
  search: string;
  categories: Record<Category, string>;
  scopes: Record<Scope | "managed", string>;
  statuses: Record<Status, string>;
  tags: Record<Tag, string>;
  agentPluginLabel: (version: string, validation: "valid" | "unsupported") => string;
  reason: (code: ReasonCode, value: string | undefined) => string;
  howItWorks: string;
  showDetails: string;
  hideDetails: string;
  unsupported: string;
  empty: string;
  emptyScope: (scope: string) => string;
  noMatches: string;
  loadFailed: string;
  retry: string;
  preview: {
    open: string;
    reveal: string;
    copyPath: string;
    copied: string;
    close: string;
    truncated: (bytes: string) => string;
    directory: string;
    missing: string;
    url: string;
    redacted: string;
    openFailed: string;
  };
  count: (n: number) => string;
}

const en: Messages = {
  title: "Customize",
  openBoard: "Open Customize",
  provider: "Provider",
  builtinProvider: "Built-in",
  noEnabledProvider: "No supported providers are enabled in Paseo.",
  project: "Project",
  noProject: "No project",
  chooseProvider: "Choose provider",
  chooseProject: "Choose project",
  closeMenu: "Close menu",
  refresh: "Rescan",
  search: "Filter by name or path",
  categories: { instructions: "Instructions", rules: "Rules", skills: "Skills", mcp: "MCP", commands: "Commands", subagents: "Subagents", plugins: "Plugins" },
  scopes: { project: "Project", user: "User", managed: "Managed" },
  statuses: {
    auto: "Auto",
    conditional: "Conditional",
    manual: "Manual only",
    pending: "Needs approval",
    disabled: "Disabled",
    inactive: "Not loaded",
  },
  tags: {
    managed: "managed",
    system: "system",
    builtin: "built-in",
    legacy: "compat",
    deprecated: "deprecated",
    nested: "nested",
    parent: "parent dir",
    command: "command",
    symlink: "symlink",
    local: "local",
    trust: "needs trust",
    systemPrompt: "replaces system prompt",
    appendPrompt: "appends to system prompt",
    sticky: "sticky",
    userInvocableOff: "hidden from /",
    nameOnly: "name only",
    ask: "asks first",
    url: "URL",
    autolearn: "auto-learn",
    synced: "claude.ai sync",
  },
  agentPluginLabel: (version, validation) => `Agent Plugins ${version}${validation === "unsupported" ? " (unverified)" : ""}`,
  reason: (code, value) => {
    switch (code) {
      case "frontmatter":
        return value ?? "frontmatter";
      case "config":
        return value ?? "config";
      case "shadowedBy":
        return `Shadowed by ${value ?? "another file"}`;
      case "nestedDir":
        return `Only inside ${value ?? "its directory"}`;
      case "onDemand":
        return `Loads when working in ${value ?? "its directory"}`;
      case "globs":
        return value ?? "globs";
      case "agentDecides":
        return "Agent decides from description";
      case "manualMention":
        return "Only when @-mentioned";
      case "always":
        return "Always applied";
      case "untrusted":
        return "Project is not trusted";
      case "needsApproval":
        return "Not approved yet";
      case "offByDefault":
        return `Off by default (${value ?? "setting"})`;
      case "ignoredExt":
        return `${value ?? "This extension"} files are ignored`;
      case "env":
        return `Disabled by ${value ?? "environment"}`;
      case "oversize":
        return `Larger than ${value ?? "the size limit"}; truncated`;
    }
  },
  howItWorks: "How it loads",
  showDetails: "Show details",
  hideDetails: "Hide details",
  unsupported: "No scanned location",
  empty: "Nothing configured",
  emptyScope: (scope) => `No ${scope.toLowerCase()} entries`,
  noMatches: "No matches",
  loadFailed: "Failed to load",
  retry: "Retry",
  preview: {
    open: "Open",
    reveal: "Reveal",
    copyPath: "Copy path",
    copied: "Path copied",
    close: "Close preview",
    truncated: (bytes) => `Preview truncated · ${bytes}`,
    directory: "This entry is a directory.",
    missing: "File not found.",
    url: "Remote URL; open it in the browser.",
    redacted: "env / headers values and secret-looking arguments are masked.",
    openFailed: "Could not open file",
  },
  count: (n) => String(n),
};

const zh: Messages = {
  title: "Customize",
  openBoard: "打开 Customize",
  provider: "Provider",
  builtinProvider: "内置",
  noEnabledProvider: "Paseo 中没有已启用且受 Customize 支持的 Provider。",
  project: "项目",
  noProject: "无项目",
  chooseProvider: "选择 provider",
  chooseProject: "选择项目",
  closeMenu: "关闭菜单",
  refresh: "重新扫描",
  search: "按名称或路径筛选",
  categories: { instructions: "指令", rules: "规则", skills: "Skills", mcp: "MCP", commands: "命令", subagents: "子代理", plugins: "插件" },
  scopes: { project: "项目级", user: "用户级", managed: "托管" },
  statuses: {
    auto: "自动",
    conditional: "按条件",
    manual: "仅手动",
    pending: "待批准",
    disabled: "已禁用",
    inactive: "未生效",
  },
  tags: {
    managed: "托管",
    system: "系统",
    builtin: "内置",
    legacy: "兼容",
    deprecated: "已弃用",
    nested: "嵌套",
    parent: "上级目录",
    command: "命令",
    symlink: "符号链接",
    local: "本地",
    trust: "需信任项目",
    systemPrompt: "替换系统提示",
    appendPrompt: "追加系统提示",
    sticky: "常驻",
    userInvocableOff: "不在 / 菜单",
    nameOnly: "仅名称",
    ask: "需确认",
    url: "URL",
    autolearn: "自动学习",
    synced: "claude.ai 同步",
  },
  agentPluginLabel: (version, validation) => `Agent Plugins ${version}${validation === "unsupported" ? "（未校验）" : ""}`,
  reason: (code, value) => {
    switch (code) {
      case "frontmatter":
        return value ?? "frontmatter";
      case "config":
        return value ?? "配置";
      case "shadowedBy":
        return `被 ${value ?? "其他文件"} 覆盖`;
      case "nestedDir":
        return `仅在 ${value ?? "所在目录"} 内生效`;
      case "onDemand":
        return `在 ${value ?? "所在目录"} 工作时加载`;
      case "globs":
        return value ?? "globs";
      case "agentDecides":
        return "Agent 根据 description 决定";
      case "manualMention":
        return "仅在 @ 提及时";
      case "always":
        return "总是应用";
      case "untrusted":
        return "项目未被信任";
      case "needsApproval":
        return "尚未批准";
      case "offByDefault":
        return `默认关闭（${value ?? "设置"}）`;
      case "ignoredExt":
        return `${value ?? "该扩展名"} 文件会被忽略`;
      case "env":
        return `被 ${value ?? "环境变量"} 关闭`;
      case "oversize":
        return `超过 ${value ?? "大小上限"}，会被截断`;
    }
  },
  howItWorks: "加载机制",
  showDetails: "展开详情",
  hideDetails: "收起详情",
  unsupported: "暂无扫描位置",
  empty: "没有配置",
  emptyScope: (scope) => `没有${scope}条目`,
  noMatches: "没有匹配项",
  loadFailed: "加载失败",
  retry: "重试",
  preview: {
    open: "打开",
    reveal: "在 Finder 中显示",
    copyPath: "复制路径",
    copied: "已复制路径",
    close: "关闭预览",
    truncated: (bytes) => `预览已截断 · ${bytes}`,
    directory: "该条目是目录。",
    missing: "文件不存在。",
    url: "远程 URL，请在浏览器中打开。",
    redacted: "env / headers 的值及疑似密钥参数已打码。",
    openFailed: "无法打开文件",
  },
  count: (n) => String(n),
};

export function messagesFor(language: string): Messages {
  return resolveAppLanguage(language) === "zh-CN" ? zh : en;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
