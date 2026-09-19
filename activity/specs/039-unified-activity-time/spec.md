# 039 — 统一 Activity 时间格式

- 状态：已实现
- 日期：2026-09-19
- 依赖：003（app lang）、025（`formatUpdatedAt` 口径）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | Workspace Rank「Last」、Agent Activity「Last」、Composer popover 行时间、Agents Show→Updated **共用同一套时间格式** |
| G2 | 优先使用 App 页面语言（`useAppLanguage` / `documentElement.lang`）；取不到时回退 `en` |
| G3 | 用 `Intl` locale 样式：当天仅时间；同年非当天加月日；跨年再加年份 |
| G4 | 客户端 UI 经统一组件 `FormattedTime` 渲染；字符串拼接场景（Agents meta）调用同一 `formatActivityTime` |

## 2. 非目标

- 不改 markdown export（`formatLocalDateTime`）的 medium/short 样式；仅固定 locale 默认 `en`
- 不改热力图月份 / insights 日期（已走 app locale）
- 不引入相对时间（"2h ago"）

## 3. 口径

- `formatActivityTime(iso, locale, now?)`：当天仅时间；同年非当天 `month/day + time`；跨年加 `year`；`formatUpdatedAt` 为别名
- 删除 UI 对 `formatDayTime` 的依赖（popover 不再用 24h 紧凑数字）
- `FormattedTime`：内部 `useAppLanguage()` + `formatActivityTime`；可选 `prefix`（如 `"Last "`）

## 4. 验收

- [x] Agent Activity / Workspace Rank / Popover / Agents Updated 时间样式一致且跟 app lang
- [x] 系统 locale 为非英文时，UI 仍跟 app lang（默认英文），不跟系统
- [x] typecheck + format 单测通过；插件 reload running
