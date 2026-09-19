# 010 — 实现方案

## 1. 纯函数

- `shared/activity.ts`：导出 `isActiveDay(day)`；`computeStreaks` 改用它。
- `shared/insights.ts`：`buildActivityInsights({ days, summary, skillsExplored, mcpServers, providers, providerFilter, locale, limit? })` → 最多 8 行 `{ label, value }[]`（不含 MCP failures）。

比率格式：能整除则整数，否则一位小数（去尾 0）。

## 2. UI

`client/global-surface.tsx` 的 insights `useMemo` 改为调用 `buildActivityInsights`；用 `useAppLanguage()` 传 locale。删除 topSkill / topSkillShare。

## 3. 测试

- `shared/activity.test.ts`：message-only / agent-only 日计入 streak。
- `shared/insights.test.ts`：行顺序、除零、`—`、Top provider 仅 All、Busiest 回退。
- `server/messages.test.ts`：message-only streak 期望改为非 0（并改测试名）。

## 4. 文档

- `specs/README.md` 增加 010。
- 006 G5 的「Total messages」展示由本 spec 取代为 Busiest / 比率；不回改 006 正文，在 010 声明覆盖。
