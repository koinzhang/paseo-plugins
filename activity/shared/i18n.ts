/**
 * Activity UI copy (066). The host SDK does not expose the app language; the
 * client reads the Paseo `language` setting (see `client/web.ts`) and resolves
 * it here. Catalogs are factories so counts format with the same locale.
 */

/** Languages the Paseo app offers in Settings → Language (besides `system`). */
export const APP_LANGUAGES = ["ar", "en", "es", "fr", "ja", "ko", "pt-BR", "ru", "zh-CN"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/**
 * Resolve the app `language` setting to a supported tag: an explicit choice wins;
 * `system` / unknown walks the OS preferences by exact tag, then base language.
 */
export function resolveAppLanguage(
  setting: string | null | undefined,
  systemLanguages: readonly string[] = [],
): AppLanguage {
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
  const exact = APP_LANGUAGES.find((lang) => lang.toLowerCase() === lower);
  if (exact) return exact;
  const base = lower.split(/[-_]/)[0];
  if (base === "zh") return "zh-CN";
  if (base === "pt") return "pt-BR";
  return APP_LANGUAGES.find((lang) => lang.toLowerCase() === base) ?? null;
}

type Formatters = { num: (value: number) => string };

function en({ num }: Formatters) {
  const count = (value: number, one: string, many: string) =>
    `${num(value)} ${value === 1 ? one : many}`;
  return {
    common: {
      activity: "Activity",
      skills: "Skills",
      mcp: "MCP",
      agents: "Agents",
      sessions: "Sessions",
      prompts: "Prompts",
      loading: "Loading…",
      retry: "Retry",
      loadFailed: "Couldn't load activity",
      today: "Today",
      now: "Now",
      noSkillOrMcp: "No skill or MCP calls yet",
      lastUsed: (time: string) => `Last ${time}`,
      failed: (value: number) => `${num(value)} failed`,
      openConversation: (label: string) => `Open conversation ${label}`,
      openSkillFile: (name: string) => `Open ${name} SKILL.md`,
      openSkillInPanel: "Open SKILL.md in panel",
      showSkills: "Show skills",
      showMcp: "Show MCP",
      agentOnly: "Activity is only available for an agent",
    },
    units: {
      agents: (value: number) => count(value, "agent", "agents"),
      sessions: (value: number) => count(value, "session", "sessions"),
      prompts: (value: number) => count(value, "prompt", "prompts"),
      skills: (value: number) => count(value, "skill", "skills"),
      mcp: (value: number) => `${num(value)} MCP`,
      calls: (value: number) => count(value, "call", "calls"),
      days: (value: number) => count(value, "day", "days"),
    },
    duration: {
      underMinute: "<1 min",
      minutes: (value: number) => `${num(value)} min`,
      hours: (value: number) => `${num(value)} h`,
      days: (value: number) => `${num(value)} days`,
      months: (value: number) => `${num(value)} months`,
    },
    kpi: {
      sessions: "Sessions",
      prompts: "Prompts",
      topProvider: "Top provider",
      topModel: "Top model",
      previous7Days: "vs prev. 7d",
      previous7DaysBare: "prev. 7d",
      skillCalls: "Skill calls",
      mcpCalls: "MCP calls",
      shellCalls: "Shell calls",
      fileReads: "File reads",
      fileWrites: "File writes",
      toolsExplored: "Tools explored",
    },
    insights: {
      title: "Activity insights",
      activeDays: "Active days",
      busiestDay: "Busiest day",
      workspaces: "Workspaces",
      codingVsChat: "Coding vs chat",
      longestStreak: "Longest streak",
      peakWeekday: "Peak weekday",
      multiTurnSessions: "Multi-turn sessions",
      avgSessionDuration: "Avg session duration",
      codingShare: (pct: number) => `${num(pct)}% coding`,
    },
    global: {
      allProviders: "All",
      providerLabel: "Provider",
      selectProvider: "Select provider",
      closeProviderMenu: "Close provider menu",
      metrics: { sessions: "Sessions", prompts: "Prompts", skills: "Skill calls", mcp: "MCP calls" },
      previousMetric: "Previous metric",
      nextMetric: "Next metric",
      providerRanking: { title: "Providers", empty: "No provider activity yet" },
      projectRanking: { title: "Projects", empty: "No project activity yet", other: "Other" },
      rankTitle: { skills: "Most used skills", mcp: "Most used MCP", models: "Most used models" },
      rankEmpty: { skills: "No skills yet", mcp: "No MCP yet", models: "No models yet" },
      rankShow: {
        skills: "Show most used skills",
        mcp: "Show most used MCP",
        models: "Show most used models",
      },
      emptyTitle: "No usage yet",
      emptyHint: "Sessions, prompts, skill and MCP calls will show up here",
    },
    heatmap: {
      title: "Activity Calendar",
      highlightMonth: (month: string) => `Highlight ${month}`,
      weekContaining: (date: string) => `Week containing ${date}`,
      through: (date: string) => `Through ${date}`,
    },
    creations: {
      title: "Daily Activity",
      empty: (days: number) => `No activity in the last ${num(days)} days`,
    },
    timeline: {
      title: "Hourly Activity",
      empty: "No activity yet",
    },
    workspace: {
      empty: "No activity in this workspace yet",
      searchPlaceholder: "Search agents",
      searchLabel: "Search agents by title",
      openSearch: "Search agents",
      closeSearch: "Close agent search",
      displayOptions: "Agent display options",
      closeDisplayOptions: "Close agent display options",
      noFilters: "No filters selected",
      noMatches: "No matching agents",
      previousPage: "Previous agents page",
      nextPage: "Next agents page",
      terminals: "Terminals",
      showOutput: (name: string) => `Show output of ${name}`,
      hideOutput: (name: string) => `Hide output of ${name}`,
      closeTerminal: (name: string) => `Close ${name}`,
      noOutput: "No output",
      showTimeline: (title: string) => `Show ${title} as a timeline`,
      showRanked: (title: string) => `Show ${title} ranked by calls`,
      archive: (label: string) => `Archive ${label}`,
      unarchive: (label: string) => `Unarchive ${label}`,
      state: {
        running: "running",
        subagents: (value: number) => count(value, "subagent", "subagents"),
        permissions: (value: number) => count(value, "pending permission", "pending permissions"),
        failed: "failed",
        finished: "turn finished, unread",
      },
      menu: { sort: "Sort", group: "Group", show: "Show", status: "Status", lifecycle: "Lifecycle" },
      options: {
        sort: { updated: "Updated", created: "Created", name: "Name", messages: "Prompts", status: "Status" },
        group: { none: "None", provider: "Provider", status: "Status" },
        show: { provider: "Provider", calls: "Calls", messages: "Prompts", updated: "Updated", prompt: "Latest prompt" },
        status: { active: "Active", archived: "Archived" },
        lifecycle: { idle: "Idle", running: "Running", error: "Error", closed: "Closed" },
      },
    },
    attention: {
      title: "Needs attention",
      empty: "No other agents need attention",
      agentOnly: "Attention is only available for an agent",
    },
    commands: {
      agentActivity: "Agent Activity",
      workspaceActivity: "Workspace Activity",
    },
  };
}

export type Messages = ReturnType<typeof en>;

function zhCN({ num }: Formatters): Messages {
  return {
    common: {
      activity: "Activity",
      skills: "Skill",
      mcp: "MCP",
      agents: "Agent",
      sessions: "会话",
      prompts: "提示词",
      loading: "加载中…",
      retry: "重试",
      loadFailed: "无法加载 Activity",
      today: "今天",
      now: "现在",
      noSkillOrMcp: "还没有 Skill 或 MCP 调用",
      lastUsed: (time: string) => `最近 ${time}`,
      failed: (value: number) => `${num(value)} 次失败`,
      openConversation: (label: string) => `打开会话 ${label}`,
      openSkillFile: (name: string) => `打开 ${name} 的 SKILL.md`,
      openSkillInPanel: "在面板中打开 SKILL.md",
      showSkills: "显示 Skill",
      showMcp: "显示 MCP",
      agentOnly: "Activity 仅适用于 Agent",
    },
    units: {
      agents: (value: number) => `${num(value)} 个 Agent`,
      sessions: (value: number) => `${num(value)} 个会话`,
      prompts: (value: number) => `${num(value)} 条提示词`,
      skills: (value: number) => `${num(value)} 次 Skill`,
      mcp: (value: number) => `${num(value)} 次 MCP`,
      calls: (value: number) => `${num(value)} 次调用`,
      days: (value: number) => `${num(value)} 天`,
    },
    duration: {
      underMinute: "<1 分钟",
      minutes: (value: number) => `${num(value)} 分钟`,
      hours: (value: number) => `${num(value)} 小时`,
      days: (value: number) => `${num(value)} 天`,
      months: (value: number) => `${num(value)} 个月`,
    },
    kpi: {
      sessions: "会话",
      prompts: "提示词",
      topProvider: "常用 Provider",
      topModel: "常用模型",
      previous7Days: "较前 7 天",
      previous7DaysBare: "前 7 天",
      skillCalls: "Skill 调用",
      mcpCalls: "MCP 调用",
      shellCalls: "Shell 调用",
      fileReads: "文件读取",
      fileWrites: "文件写入",
      toolsExplored: "用过的工具",
    },
    insights: {
      title: "Activity 洞察",
      activeDays: "活跃天数",
      busiestDay: "最忙的一天",
      workspaces: "工作区",
      codingVsChat: "编码 vs 对话",
      longestStreak: "最长连续",
      peakWeekday: "最活跃星期",
      multiTurnSessions: "多轮会话",
      avgSessionDuration: "平均会话时长",
      codingShare: (pct: number) => `${num(pct)}% 编码`,
    },
    global: {
      allProviders: "全部",
      providerLabel: "Provider",
      selectProvider: "选择 Provider",
      closeProviderMenu: "关闭 Provider 菜单",
      metrics: { sessions: "会话", prompts: "提示词", skills: "Skill 调用", mcp: "MCP 调用" },
      previousMetric: "上一个指标",
      nextMetric: "下一个指标",
      providerRanking: { title: "Provider", empty: "还没有 Provider 活动" },
      projectRanking: { title: "项目", empty: "还没有项目活动", other: "其他" },
      rankTitle: { skills: "常用 Skill", mcp: "常用 MCP", models: "常用模型" },
      rankEmpty: { skills: "还没有 Skill", mcp: "还没有 MCP", models: "还没有模型" },
      rankShow: { skills: "显示常用 Skill", mcp: "显示常用 MCP", models: "显示常用模型" },
      emptyTitle: "还没有使用记录",
      emptyHint: "会话、提示词、Skill 和 MCP 调用会显示在这里",
    },
    heatmap: {
      title: "活动日历",
      highlightMonth: (month: string) => `高亮 ${month}`,
      weekContaining: (date: string) => `${date} 所在周`,
      through: (date: string) => `截至 ${date}`,
    },
    creations: {
      title: "每日活动",
      empty: (days: number) => `最近 ${num(days)} 天没有活动`,
    },
    timeline: {
      title: "每小时活动",
      empty: "还没有活动",
    },
    workspace: {
      empty: "此工作区还没有活动",
      searchPlaceholder: "搜索 Agent",
      searchLabel: "按标题搜索 Agent",
      openSearch: "搜索 Agent",
      closeSearch: "关闭 Agent 搜索",
      displayOptions: "Agent 显示选项",
      closeDisplayOptions: "关闭 Agent 显示选项",
      noFilters: "未选择筛选条件",
      noMatches: "没有匹配的 Agent",
      previousPage: "上一页 Agent",
      nextPage: "下一页 Agent",
      terminals: "终端",
      showOutput: (name: string) => `显示 ${name} 的输出`,
      hideOutput: (name: string) => `隐藏 ${name} 的输出`,
      closeTerminal: (name: string) => `关闭 ${name}`,
      noOutput: "无输出",
      showTimeline: (title: string) => `以时间线显示 ${title}`,
      showRanked: (title: string) => `按调用次数排序 ${title}`,
      archive: (label: string) => `归档 ${label}`,
      unarchive: (label: string) => `取消归档 ${label}`,
      state: {
        running: "运行中",
        subagents: (value: number) => `${num(value)} 个子 Agent`,
        permissions: (value: number) => `${num(value)} 个待处理权限`,
        failed: "失败",
        finished: "本轮已完成，未读",
      },
      menu: { sort: "排序", group: "分组", show: "显示", status: "状态", lifecycle: "生命周期" },
      options: {
        sort: { updated: "更新时间", created: "创建时间", name: "名称", messages: "提示词", status: "状态" },
        group: { none: "无", provider: "Provider", status: "状态" },
        show: { provider: "Provider", calls: "调用", messages: "提示词", updated: "更新时间", prompt: "最新提示词" },
        status: { active: "活跃", archived: "已归档" },
        lifecycle: { idle: "空闲", running: "运行中", error: "错误", closed: "已关闭" },
      },
    },
    attention: {
      title: "需要关注",
      empty: "没有其他需要关注的 Agent",
      agentOnly: "仅在 Agent 中可用",
    },
    commands: {
      agentActivity: "Agent Activity",
      workspaceActivity: "工作区 Activity",
    },
  };
}

const CATALOGS: Partial<Record<AppLanguage, (fmt: Formatters) => Messages>> = {
  en,
  "zh-CN": zhCN,
};

const cache = new Map<string, Messages>();

/** Copy for `locale`; languages without a catalog fall back to English text. */
export function messagesFor(locale: string = "en"): Messages {
  const cached = cache.get(locale);
  if (cached) return cached;
  const lang = resolveAppLanguage(locale);
  const factory = CATALOGS[lang] ?? en;
  let numberLocale = locale;
  try {
    numberLocale = Intl.getCanonicalLocales(locale)[0] ?? "en";
  } catch {
    numberLocale = "en";
  }
  const messages = factory({ num: (value) => value.toLocaleString(numberLocale) });
  cache.set(locale, messages);
  return messages;
}
